# WOPP — Deployment Runbook

**Audience:** DevOps / release engineer  
**Prerequisites:** Docker, Docker Compose, Node 20, production secrets in secret manager

---

## Overview

Deployment order:

1. Database (migrations)
2. Redis
3. API + WebSocket
4. Admin dashboard
5. Docker platform (localhost-published ports for host Nginx)
6. Host Nginx (`mwpp` site) proxies `/api/` + `/realtime` to Docker; Flask remains apex
7. Mobile app release (after API verified)

### Coexistence with Flask public website

Production apex `woppandmopp.com` is served by **host Nginx → Flask Gunicorn (`mwpp.service` :8000)**.

Docker Compose must **not** bind host `:80`/`:443`. Publish NestJS/admin on localhost only:

| Service | Host bind |
|---------|-----------|
| API | `127.0.0.1:4000` |
| WebSocket | `127.0.0.1:4100` |
| Admin web | `127.0.0.1:3001` |
| Docker Nginx (internal) | `127.0.0.1:8080` |

Host Nginx site config lives in the Flask repo: `deploy/nginx/mwpp.conf` (see that project's `VPS_DEPLOYMENT.md`).

Mobile `API_BASE_URL`: `https://woppandmopp.com/api/v1`

---

## Phase 0 — Pre-deploy checklist

- [ ] All secrets in `docs/PRODUCTION_SECRETS.md` configured
- [ ] DNS: `api.*`, `admin.*`, `ws.*` point to load balancer / host
- [ ] TLS certificates in `infra/nginx/certs/` (or terminate at LB)
- [ ] Postgres backup taken: `node scripts/backup/postgres-backup.mjs`
- [ ] Uploads backup (if upgrading): `node scripts/backup/uploads-backup.mjs`

---

## Phase 1 — Prepare environment file

### Option A: From template (manual host)

```bash
cp .env.production.example .env.production
# Edit all replace_with_* values
```

### Option B: Materialize from exported secrets (CI / scripted)

```bash
export NODE_ENV=production
export DATABASE_URL=...
export REDIS_URL=...
export JWT_ACCESS_SECRET=...
export JWT_REFRESH_SECRET=...
export CORS_ORIGIN=https://admin.your-domain.org
export CONTENT_ACCESS_SECRET=...
export METRICS_AUTH_TOKEN=...
export API_PUBLIC_URL=https://api.your-domain.org
export NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.org/api/v1
export NEXT_PUBLIC_WEBSOCKET_URL=https://ws.your-domain.org
export POSTGRES_USER=ministry
export POSTGRES_PASSWORD=...
export POSTGRES_DB=ministry_platform
export IMAGE_TAG=prod-$(git rev-parse --short HEAD)

node scripts/deploy/materialize-production-env.mjs
```

### Validate

```bash
node scripts/env/validate-production-secrets.mjs --mode=production
node scripts/env/validate-env.mjs --target=api
```

---

## Phase 2 — Database migrations

```bash
# Direct (managed Postgres)
DATABASE_URL="postgresql://..." node scripts/deploy/run-migrations.mjs

# OR via compose migrate service
docker compose -f docker-compose.prod.yml run --rm migrate
```

Verify:

```bash
cd services/api && npx prisma migrate status
```

---

## Phase 3 — Redis

Redis starts automatically with compose. For managed Redis, set `REDIS_URL` in `.env.production`.

```bash
docker compose -f docker-compose.prod.yml up -d redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: PONG
```

---

## Phase 4 — Build and deploy application stack

### Full automated deploy

```bash
export IMAGE_TAG=prod-$(date +%Y%m%d-%H%M)
export DEPLOY_ENV=production
node scripts/deploy/deploy.mjs
```

### Manual compose steps

```bash
export IMAGE_TAG=prod-latest
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d api websocket admin-web reverse-proxy
```

### Nginx / Docker DNS

The reverse-proxy uses Docker embedded DNS (`127.0.0.11`) with variable `proxy_pass` so Compose service names (`api`, `websocket`, `admin-web`) resolve at **request time**, not only at nginx startup. This avoids `host not found in upstream` on first boot.

Validate config before deploy:

```bash
docker run --rm \
  -v "$PWD/infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$PWD/infra/nginx/conf.d:/etc/nginx/conf.d:ro" \
  nginx:1.27-alpine nginx -t
```

If backends are still starting, nginx will remain up; proxied routes may return `502` until targets are healthy.

---

## Phase 5 — Health validation

```bash
export API_HEALTH_URL=https://api.your-domain.org/api/v1/health
export WS_HEALTH_URL=https://ws.your-domain.org/api/v1/health
export ADMIN_HEALTH_URL=https://admin.your-domain.org
node scripts/deploy/verify-health.mjs
```

### Internal (compose test port 8080)

```bash
curl http://127.0.0.1:8080/health/nginx
curl http://127.0.0.1:8080/api/v1/health
```

### Integration health

```bash
curl https://api.your-domain.org/api/v1/health/email
curl https://api.your-domain.org/api/v1/health/flutterwave
```

---

## Phase 6 — Admin dashboard verification

1. Open `https://admin.your-domain.org/login`
2. Login as SUPER_ADMIN
3. Verify notifications realtime connects (WebSocket)
4. Upload test clip thumbnail (validates uploads volume)
5. Confirm 403 on forbidden route does not logout

---

## Phase 7 — Mobile app release

After API is stable:

```bash
cd apps/mobile-flutter
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.your-domain.org/api/v1
```

Submit to Play Console / App Store. See `scripts/beta/build-mobile-staging.mjs` for command templates.

---

## CI/CD deployment (GitHub Actions)

Workflow: `.github/workflows/deploy-production.yml`

Required GitHub **production** environment secrets:

- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_REDIS_URL`
- `PRODUCTION_JWT_ACCESS_SECRET`
- `PRODUCTION_JWT_REFRESH_SECRET`
- `PRODUCTION_CONTENT_ACCESS_SECRET`
- `PRODUCTION_METRICS_AUTH_TOKEN`
- `PRODUCTION_CORS_ORIGIN`
- `PRODUCTION_API_PUBLIC_URL`
- `PRODUCTION_POSTGRES_PASSWORD`

Set `run_compose_up: true` in workflow when runner/host supports live compose deploy.

---

## Local stack validation (staging/dev)

```bash
node scripts/deploy/validate-production-stack.mjs
# Teardown
docker compose -f docker-compose.prod.yml down
```

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| API exits on start | JWT/CONTENT_ACCESS secrets; logs show `Security configuration error` |
| CORS errors in admin | `CORS_ORIGIN` must exactly match admin URL |
| WebSocket fails | Nginx `websocket.server.conf`; `NEXT_PUBLIC_WEBSOCKET_URL` |
| Migrations fail | Postgres reachable; `migrate` service logs |
| Uploads missing after restart | Verify `uploads_prod_data` volume mounted |

---

## Related documents

- `ROLLBACK_RUNBOOK.md`
- `BACKUP_RESTORE_VALIDATION.md`
- `docs/PRODUCTION_SECRETS.md`
- `INFRA_REMEDIATION_REPORT.md`
