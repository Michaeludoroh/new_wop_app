# WOP Platform — Production Checklist

**Date:** 2026-06-19  
**Use with:** `DEPLOYMENT_READINESS_AUDIT.md`, `SECURITY_REVIEW.md`

---

## Pre-flight gate

Complete all **Blocker** items before production cutover.

| ID | Item | Owner | Status |
|----|------|-------|--------|
| BLK-001 | Create `infra/nginx/nginx.conf`, `conf.d/`, and TLS certs OR use external LB and remove nginx service from compose | DevOps | ☐ |
| BLK-002 | Replace placeholder deploy step in `.github/workflows/_deploy-reusable.yml` with provider CLI | DevOps | ☐ |
| BLK-003 | Implement real rollback in `scripts/deploy/rollback.mjs` | DevOps | ☐ |
| BLK-004 | Provision production secret store (JWT, DATABASE_URL, CORS_ORIGIN, etc.) | DevOps | ☐ |

---

## 1. Environment variables

### API (required)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` — managed Postgres connection string
- [ ] `REDIS_URL` — managed Redis connection string
- [ ] `JWT_ACCESS_SECRET` — ≥32 chars, cryptographically random
- [ ] `JWT_REFRESH_SECRET` — ≥32 chars, different from access secret
- [ ] `JWT_ACCESS_EXPIRES_IN=15m` (or approved value)
- [ ] `JWT_REFRESH_EXPIRES_IN=7d` (must exceed access expiry)
- [ ] `CORS_ORIGIN=https://<admin-host>` (exact origin, no wildcard)
- [ ] `METRICS_AUTH_TOKEN` — random token for `/metrics`
- [ ] `CONTENT_ACCESS_SECRET` — ≥32 chars (eBook streaming)
- [ ] `API_PUBLIC_URL=https://<api-host>`
- [ ] `PAYMENT_REDIRECT_BASE_URL=https://<api-host>/api/v1`

Validate:
```bash
NODE_ENV=production DATABASE_URL=... REDIS_URL=... JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
JWT_ACCESS_EXPIRES_IN=15m JWT_REFRESH_EXPIRES_IN=7d CORS_ORIGIN=... \
node scripts/env/validate-env.mjs --target=api
```

### API (integrations)

- [ ] **Firebase:** `FIREBASE_SERVICE_ACCOUNT_JSON` OR `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY`
- [ ] **SMTP:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [ ] **Flutterwave:** `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`
- [ ] **Optional Sentry:** `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`

### Rate limiting (use correct names)

- [ ] `RATE_LIMIT_TTL_MS=60000` (not `THROTTLE_TTL`)
- [ ] `RATE_LIMIT_LIMIT=80` (not `THROTTLE_LIMIT`)

### Admin-web (required)

- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_API_BASE_URL=https://<api-host>/api/v1`
- [ ] `NEXT_PUBLIC_WEBSOCKET_URL=https://<ws-host>`

Validate:
```bash
NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=... NEXT_PUBLIC_WEBSOCKET_URL=... \
node scripts/env/validate-env.mjs --target=admin-web
```

### Mobile (build-time)

- [ ] `API_BASE_URL=https://<api-host>/api/v1` via `--dart-define`
- [ ] `google-services.json` matches production Firebase project
- [ ] `GoogleService-Info.plist` matches production Firebase project
- [ ] iOS APNs key uploaded to Firebase Console

---

## 2. Docker & infrastructure

- [ ] Fix compose healthchecks (install `wget` OR switch to Node-based check matching Dockerfile)
- [ ] Add persistent volume for API `uploads/`
- [ ] Add migration init container or pre-deploy job (`node scripts/deploy/run-migrations.mjs`)
- [ ] Postgres: enable automated backups (managed provider or cron `pg_dump`)
- [ ] Redis: confirm AOF persistence or managed failover
- [ ] TLS certificates valid for API, WS, and admin hostnames
- [ ] Firewall: Postgres/Redis not publicly exposed

Build images:
```bash
docker build -t ministry-api:prod ./services/api
docker build -t ministry-admin:prod ./apps/admin-web
```

---

## 3. Database

- [ ] Staging dry-run of all 14 migrations completed
- [ ] Production backup taken **before** first migration
- [ ] Run migrations:
  ```bash
  DATABASE_URL=<prod> node scripts/deploy/run-migrations.mjs
  ```
- [ ] Verify: `npx prisma migrate status` → "Database schema is up to date"
- [ ] Seed only if required (do **not** run dev seed in production without review)
- [ ] Confirm connection pool limits appropriate for instance size

---

## 4. Prisma schema

- [ ] `scripts/prisma/validate-schema-diff.mjs` passes against production DB (post-migrate)
- [ ] Prisma client version pinned in `package-lock.json`

---

## 5. Firebase & FCM

- [ ] Firebase project created for production
- [ ] Service account JSON stored in secret manager (not in git)
- [ ] API startup log shows Firebase Admin initialized
- [ ] `GET /api/v1/health` + push smoke test from physical device
- [ ] Android notification permission flow tested (Android 13+)
- [ ] iOS push tested with APNs production environment

---

## 6. SMTP

- [ ] SMTP provider account provisioned (SendGrid, SES, etc.)
- [ ] SPF/DKIM/DMARC DNS records configured for sending domain
- [ ] `GET /api/v1/health/email` → `status: ready`
- [ ] Send test: forgot-password email to real inbox

---

## 7. Flutterwave

- [ ] Production or live sandbox keys in secret store
- [ ] `GET /api/v1/health/flutterwave` → `status: ready`
- [ ] Webhook URL registered: `https://<api-host>/api/v1/payments/webhook/flutterwave`
- [ ] `PAYMENT_REDIRECT_BASE_URL` points to public API
- [ ] End-to-end: subscription checkout → redirect → entitlement active
- [ ] Webhook signature validation tested

---

## 8. Admin-web build

- [ ] `cd apps/admin-web && npm run build` — success
- [ ] Build executed with production `NEXT_PUBLIC_*` URLs
- [ ] Login as SUPER_ADMIN, ADMIN, MODERATOR — route access correct
- [ ] 403 on forbidden action does **not** log user out
- [ ] Clips/eBooks upload smoke test

---

## 9. Mobile release

- [ ] Production `API_BASE_URL` dart-define set
- [ ] `flutter test` — all pass
- [ ] Release build:
  ```bash
  flutter build apk --release --dart-define=API_BASE_URL=https://<api-host>/api/v1
  flutter build appbundle --release --dart-define=API_BASE_URL=...
  flutter build ipa --release --dart-define=API_BASE_URL=...
  ```
- [ ] Login, profile edit, subscription, push notification smoke test on device
- [ ] Store listing assets and privacy policy URL ready

---

## 10. Security

- [ ] JWT secrets rotated from any dev/staging values
- [ ] `CORS_ORIGIN` restricted to admin domain only
- [ ] `/metrics` requires `METRICS_AUTH_TOKEN`
- [ ] Helmet active (verify response headers on API)
- [ ] Admin nginx / LB adds HSTS, X-Frame-Options if not in Next.js
- [ ] Upload directories not world-readable via public URL
- [ ] Firebase service account JSON not in repository
- [ ] `.env.production` not committed

See `SECURITY_REVIEW.md` for full matrix.

---

## 11. CORS & rate limiting

- [ ] Admin origin loads API without CORS errors in browser console
- [ ] Preflight `OPTIONS` succeeds for authenticated requests
- [ ] Auth endpoints return 429 after brute-force threshold (optional pen test)

---

## 12. Logging & monitoring

- [ ] Log aggregation configured (CloudWatch, Datadog, Loki, etc.)
- [ ] Prometheus scraping `/metrics` with auth token
- [ ] Alertmanager routes configured for API 5xx, DB down, Redis down
- [ ] Sentry DSN set (optional)
- [ ] Correlation ID visible in API logs (`X-Correlation-Id`)

Post-deploy verification:
```bash
API_HEALTH_URL=https://<api-host>/api/v1/health \
WS_HEALTH_URL=https://<ws-host>/api/v1/health \
ADMIN_HEALTH_URL=https://<admin-host> \
node scripts/deploy/verify-health.mjs
```

---

## 13. Backup & recovery

- [ ] Postgres automated backup schedule documented (target RPO ≤15 min)
- [ ] Upload/media backup strategy defined (S3 sync or volume snapshots)
- [ ] Restore drill completed on staging within last 30 days
- [ ] DR runbook accessible: `docs/disaster-recovery.md`
- [ ] On-call contacts and escalation path defined

---

## Deployment sequence (after blockers cleared)

Execute in this order:

| Step | Component | Action |
|------|-----------|--------|
| 1 | **Database** | Backup → `node scripts/deploy/run-migrations.mjs` → verify status |
| 2 | **Redis** | Start/verify instance → confirm `REDIS_URL` reachable |
| 3 | **API** | Deploy API service → health check → integration health checks |
| 4 | **WebSocket** | Deploy WS service (`WEBSOCKET_ONLY_MODE=true`) → health check |
| 5 | **Admin dashboard** | Build with prod URLs → deploy → login smoke test |
| 6 | **Reverse proxy / TLS** | Enable nginx/LB routing to API, WS, admin |
| 7 | **Mobile app release** | Build with prod dart-define → store submission after prod API verified |

---

## Post-deploy smoke tests (15 min)

- [ ] Register new user (mobile)
- [ ] Login / refresh token (mobile + admin)
- [ ] Accept policies gate (mobile)
- [ ] Create announcement (admin) → appears on mobile
- [ ] Subscription checkout (Flutterwave test/live)
- [ ] Push notification received (device)
- [ ] Forgot password email received
- [ ] Realtime notification (websocket connected)

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering | | | ☐ |
| DevOps | | | ☐ |
| Product | | | ☐ |
| Security | | | ☐ |
