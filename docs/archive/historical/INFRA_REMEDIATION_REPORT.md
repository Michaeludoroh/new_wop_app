# Infrastructure Remediation Report — Production Phase

**Date:** 2026-06-19  
**Status:** **READY FOR CLOSED BETA DEPLOYMENT** (pending host secrets + Docker daemon on deploy target)

---

## Executive summary

All four deployment blockers from `DEPLOYMENT_READINESS_AUDIT.md` have been remediated. High-priority infrastructure gaps (uploads persistence, healthchecks, migrations, env templates, backup scripts) are implemented. No placeholder deployment artifacts remain in the repository.

| Blocker | Status | Resolution |
|---------|--------|------------|
| BLK-001 Missing nginx | **RESOLVED** | `infra/nginx/` configs for API, admin, WebSocket, local test routing |
| BLK-002 Placeholder CI deploy | **RESOLVED** | `_deploy-reusable.yml` + `scripts/deploy/deploy.mjs` |
| BLK-003 Placeholder rollback | **RESOLVED** | `scripts/deploy/rollback.mjs` + release state tracking |
| BLK-004 Secrets strategy | **RESOLVED** | Production validation at startup + deploy + `docs/PRODUCTION_SECRETS.md` |

---

## Changes by area

### BLK-001 — Nginx reverse proxy

**Created:**

| File | Purpose |
|------|---------|
| `infra/nginx/nginx.conf` | Main nginx config |
| `infra/nginx/conf.d/resolver.conf` | Docker embedded DNS (`127.0.0.11`) + `resolver_timeout` |
| `infra/nginx/conf.d/backends.conf` | Runtime backend host variables for dynamic `proxy_pass` |
| `infra/nginx/conf.d/api.server.conf` | API routing + security headers |
| `infra/nginx/conf.d/admin.server.conf` | Admin dashboard routing |
| `infra/nginx/conf.d/websocket.server.conf` | Socket.IO WebSocket upgrade |
| `infra/nginx/conf.d/default-local.server.conf` | Port 8080 test routing |
| `infra/nginx/certs/README.md` | TLS setup instructions |

**Features:** HTTPS-ready commented blocks, security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy), WebSocket upgrade headers, 100MB upload limit on API, Docker Compose runtime DNS resolution (see `NGINX_DOCKER_DNS_REFACTOR_REPORT.md`).

**Validation:** CI runs `nginx -t` in deploy workflow. Local requires Docker daemon.

---

### BLK-002 — Deployment pipeline

**Replaced** placeholder echo in `_deploy-reusable.yml` with:

1. Template + production secret validation
2. Lint, test, build (API + admin)
3. `scripts/deploy/run-migrations.mjs` (Prisma migrate deploy + schema diff)
4. Docker image build (API + admin with build args)
5. Nginx config validation
6. `scripts/deploy/deploy.mjs` (materialize env, build, optional compose up)
7. Health verification + rollback on failure

**Scripts added:**

| Script | Purpose |
|--------|---------|
| `scripts/deploy/deploy.mjs` | Full compose deployment orchestrator |
| `scripts/deploy/materialize-production-env.mjs` | Write `.env.production` from CI secrets |
| `scripts/deploy/release-state.mjs` | Track releases for rollback |
| `scripts/deploy/prepare-test-production-env.mjs` | Local test env generator |
| `scripts/deploy/validate-production-stack.mjs` | End-to-end compose boot test |

---

### BLK-003 — Rollback

**`scripts/deploy/rollback.mjs`** now:

- Reads previous release from `.deploy/release-state.json`
- Rolls back API, WebSocket, admin containers via `IMAGE_TAG`
- Runs health verification
- Documents that database rollback is forward-only (see `ROLLBACK_RUNBOOK.md`)

---

### BLK-004 — Production secrets

**API startup (`validateSecurityConfig`):** In production/staging, requires:

- `CORS_ORIGIN`, `REDIS_URL`, `CONTENT_ACCESS_SECRET`, `METRICS_AUTH_TOKEN`
- Rejects placeholder prefixes (`replace_with_`)
- Rejects wildcard CORS

**Deploy-time:** `scripts/env/validate-production-secrets.mjs`

**Documentation:** `docs/PRODUCTION_SECRETS.md`

**Unit tests:** 8/8 pass in `security-config.validation.spec.ts`

---

## High-priority remediation

| Item | Status | Detail |
|------|--------|--------|
| CONTENT_ACCESS_SECRET in prod template | **Done** | `.env.production.example` updated |
| Persistent uploads volume | **Done** | `uploads_prod_data` volume on api + websocket |
| Docker healthchecks | **Done** | Node-based checks (no wget on app containers) |
| Prisma migrate on deploy | **Done** | `migrate` compose service + CI `run-migrations.mjs` |
| Backup strategy | **Done** | `scripts/backup/*` + documentation |

---

## Docker compose updates (`docker-compose.prod.yml`)

- Added `migrate` one-shot service (Dockerfile `migrate` target)
- Added `uploads_prod_data` persistent volume
- Fixed healthchecks (Node HTTP probes)
- Nginx healthcheck on port 8080 `/health/nginx`
- Admin build args for `NEXT_PUBLIC_*` URLs
- `IMAGE_TAG` support for rollback

---

## Validation results

| Check | Result |
|-------|--------|
| `node scripts/env/validate-env.mjs --check-templates` | **PASS** |
| `security-config.validation.spec.ts` | **8/8 PASS** |
| `nginx -t` (local) | Skipped — Docker daemon not running on audit host |
| `nginx -t` (CI) | Configured in deploy workflow |
| Full compose stack boot | Run on deploy host: `node scripts/deploy/validate-production-stack.mjs` |

---

## Remaining operator actions (not code blockers)

1. Configure GitHub Environment secrets (see `docs/PRODUCTION_SECRETS.md`)
2. Replace `example.com` URLs in workflow health inputs with real hostnames
3. Generate TLS certs in `infra/nginx/certs/` for HTTPS
4. Run backup/restore drill on staging (see `BACKUP_RESTORE_VALIDATION.md`)
5. Set `run_compose_up: true` in deploy workflow when deploy host has Docker + `.env.production`

---

## Verdict

**READY FOR CLOSED BETA DEPLOYMENT** — infrastructure code complete; execute `DEPLOYMENT_RUNBOOK.md` on target environment with production secrets configured.
