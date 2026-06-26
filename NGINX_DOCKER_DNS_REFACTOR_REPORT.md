# Nginx Docker DNS Refactor Report

**Date:** 2026-06-26  
**Issue:** Production `reverse-proxy` failed to start with `host not found in upstream "api:4000"` despite healthy backend containers and passing `nginx -t`.  
**Root cause:** Static `upstream { server api:4000; }` blocks resolve Compose service hostnames once at worker startup. If Docker embedded DNS has not yet registered a service when nginx boots, resolution fails and the container exits. `nginx -t` only validates syntax and does not perform the same startup-time upstream resolution.

---

## Solution summary

Replaced static upstream blocks with:

1. **Docker embedded DNS resolver** (`127.0.0.11`) and `resolver_timeout` in `resolver.conf`
2. **Backend host variables** (`map` → `$ministry_*_upstream`) in `backends.conf`
3. **Variable `proxy_pass`** in every server location so hostnames resolve per request
4. **HTTP keepalive** via `proxy_http_version 1.1` + `proxy_set_header Connection ""` on non-WebSocket routes (WebSocket routes keep `Connection "upgrade"`)

Nginx now starts on first `docker compose up` even when `api`, `websocket`, or `admin-web` are still registering in Docker DNS. Requests that arrive before a backend is reachable return `502` temporarily instead of preventing nginx from starting.

---

## Files changed

| File | Action | Why |
|------|--------|-----|
| `infra/nginx/conf.d/resolver.conf` | **Created** | Centralizes Docker embedded DNS (`127.0.0.11`), `valid=10s` TTL refresh, `ipv6=off`, and `resolver_timeout 5s` as required for runtime resolution. |
| `infra/nginx/conf.d/backends.conf` | **Created** | Defines `$ministry_api_upstream`, `$ministry_websocket_upstream`, and `$ministry_admin_upstream` via `map` so `proxy_pass` uses variables and defers DNS lookup to request time. Targets: `api:4000`, `websocket:4100`, `admin-web:3001`. |
| `infra/nginx/conf.d/upstreams.conf` | **Deleted** | Static `upstream` blocks caused one-time startup resolution and the reported failure. Replaced by `backends.conf` + variable `proxy_pass`. |
| `infra/nginx/nginx.conf` | **Modified** | Includes `resolver.conf` and `backends.conf` before server blocks; removed `upstreams.conf` include. |
| `infra/nginx/conf.d/api.server.conf` | **Modified** | `proxy_pass http://$ministry_api_upstream`; added `Connection ""` for HTTP keepalive on API routes (including commented HTTPS block). |
| `infra/nginx/conf.d/admin.server.conf` | **Modified** | `proxy_pass http://$ministry_admin_upstream` on `/` and `/_next/static/`; added `Connection ""` for keepalive. |
| `infra/nginx/conf.d/websocket.server.conf` | **Modified** | `proxy_pass http://$ministry_websocket_upstream`; retains `Connection "upgrade"` for WebSocket/Socket.IO (keepalive pool not used for long-lived upgrade connections). |
| `infra/nginx/conf.d/default-local.server.conf` | **Modified** | Port 8080 test routes use variable `proxy_pass`; HTTP routes get `Connection ""`, `/realtime` keeps upgrade headers. |
| `INFRA_REMEDIATION_REPORT.md` | **Modified** | Documents new resolver/backends layout instead of removed `upstreams.conf`. |
| `DEPLOYMENT_RUNBOOK.md` | **Modified** | Notes Docker DNS behavior, validation command, and first-boot expectations for reverse-proxy. |
| `NGINX_DOCKER_DNS_REFACTOR_REPORT.md` | **Created** | This report. |

**Unchanged:** `security-headers.conf`, `certs/README.md`, `docker-compose.prod.yml` service names (`api`, `websocket`, `admin-web`), CI `nginx -t` workflow (same mount paths).

---

## Requirement checklist

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Do not resolve Docker hostnames only at startup | Variable `proxy_pass` + `map` backends resolve at request time |
| 2 | Use Docker embedded DNS `127.0.0.11` | `resolver 127.0.0.11` in `resolver.conf` |
| 3 | Configure `resolver_timeout` | `resolver_timeout 5s` in `resolver.conf` |
| 4 | Dynamic `proxy_pass` upstream resolution | All `proxy_pass` use `http://$ministry_*_upstream` |
| 5 | Preserve keepalive where appropriate | `Connection ""` on HTTP/API/admin routes; WebSocket keeps upgrade |
| 6 | Compatibility with api / websocket / admin-web | Same Compose service names in `backends.conf` |
| 7 | Works after `docker compose up` without restarts | No startup-time upstream hostname resolution |
| 8 | Validate with `nginx -t` | See validation section below |
| 9 | Update affected documentation | Runbook + infra report updated |
| 10 | Report of changes | This document |

---

## Validation

From the repository root (requires Docker):

```bash
docker run --rm \
  -v "$PWD/infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$PWD/infra/nginx/conf.d:/etc/nginx/conf.d:ro" \
  nginx:1.27-alpine nginx -t
```

Expected: `syntax is ok` and `test is successful` — no `host not found in upstream` because upstream blocks no longer exist.

Full stack smoke test:

```bash
docker compose -f docker-compose.prod.yml up -d
curl -sf http://127.0.0.1:8080/health/nginx
curl -sf http://127.0.0.1:8080/api/v1/health
```

---

## Operational notes

- **Transient 502s:** If nginx receives traffic before a backend is healthy, clients may see `502 Bad Gateway` until Docker DNS and the target container are ready. This is expected and preferable to nginx failing to start.
- **`depends_on`:** `docker-compose.prod.yml` still waits for healthy backends before starting `reverse-proxy`; the DNS fix removes the race where nginx resolves hostnames before Compose DNS records exist.
- **Keepalive trade-off:** Variable `proxy_pass` does not use the `upstream` module keepalive pool. HTTP routes use `Connection ""` for HTTP/1.1 connection reuse to backends, which is appropriate for API and admin traffic.
