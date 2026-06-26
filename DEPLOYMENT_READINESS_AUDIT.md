# WOP Platform — Production Deployment Readiness Audit

**Date:** 2026-06-19  
**Scope:** Environment, infrastructure, data layer, integrations, builds, security controls, observability, and recovery  
**Verdict:** **NOT READY** for unattended production cutover — **4 blockers** must be resolved first (see §Findings summary)

---

## Executive summary

| Area | Status | Severity |
|------|--------|----------|
| Environment variables | Templates aligned; production secrets unset | High |
| Docker configuration | Images solid; compose prod stack incomplete | **Blocker** |
| Database migrations | 14 migrations; local DB up to date | Pass |
| Prisma schema consistency | Validation script + migrate status OK | Pass |
| Firebase / FCM | Code ready; credentials not in prod env | High |
| SMTP | Code ready; falls back to MOCK_SMTP | High |
| Flutterwave | Code ready; credentials not validated live | High |
| Admin-web production build | **PASS** (`next build`) | Pass |
| Mobile production config | Staging script only; dart-define required | Medium |
| Security headers (API) | Helmet enabled in prod-like mode | Pass |
| Security headers (Admin) | No `next.config` hardening | Medium |
| CORS | Fail-closed in prod when unset; requires `CORS_ORIGIN` | Pass (if configured) |
| Rate limiting | Global + auth throttles active | Pass |
| Logging / monitoring | Pino + Prometheus + optional Sentry | Medium |
| Backup strategy | Documented only; no automated jobs | High |

---

## Validation performed

| Check | Result |
|-------|--------|
| `node scripts/env/validate-env.mjs --check-templates` | **PASS** |
| `npx prisma migrate status` (local) | **PASS** — 14 migrations, schema up to date |
| `apps/admin-web npm run build` | **PASS** |
| Code review: Docker, CI/CD, security, integrations | Complete |

---

## 1. Environment variables

### Current state

- Canonical templates: `.env.production.example`, `.env.staging.example`, `services/api/.env.example`, `apps/admin-web/.env.example`, `apps/mobile-flutter/.env.example`
- Validation script: `scripts/env/validate-env.mjs` (per-target, mode-aware)
- API startup validation: `validateSecurityConfig()` rejects weak/missing JWT secrets (≥32 chars)

### Required for API (production)

| Variable | In prod template | Runtime enforced |
|----------|------------------|------------------|
| `NODE_ENV=production` | ✅ | — |
| `DATABASE_URL` | ✅ | ✅ (Prisma) |
| `REDIS_URL` | ✅ | — |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | ✅ (startup) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | ✅ | ✅ (startup) |
| `CORS_ORIGIN` | ✅ | Required by validate-env in prod |
| `METRICS_AUTH_TOKEN` | ✅ | Required for `/metrics` in prod |

### Gaps

| ID | Finding | Severity |
|----|---------|----------|
| ENV-01 | `.env.production.example` missing `CONTENT_ACCESS_SECRET`, `API_PUBLIC_URL` (present in staging template) — eBook streaming breaks in prod if omitted | **High** |
| ENV-02 | Template uses `THROTTLE_TTL` / `THROTTLE_LIMIT` but API reads `RATE_LIMIT_TTL_MS` / `RATE_LIMIT_LIMIT` — rate limit tuning silently ignored | Medium |
| ENV-03 | No `SENTRY_DSN` in production template; error tracking optional but undocumented | Low |
| ENV-04 | Production integration secrets (Firebase, SMTP, Flutterwave) are empty placeholders — must be set in secret store before cutover | **High** |
| ENV-05 | `docker-compose.prod.yml` expects `.env.production` file at repo root — not committed (correct) but must be created pre-deploy | Medium |

---

## 2. Docker configuration

### Strengths

- **API Dockerfile:** Multi-stage build, non-root user, `tini`, Prisma generate, Node-based HEALTHCHECK
- **Admin Dockerfile:** Multi-stage build, non-root user, HEALTHCHECK
- **Prod compose:** Postgres + Redis AOF persistence, separate API/WebSocket services, healthchecks, reverse-proxy slot

### Gaps

| ID | Finding | Severity |
|----|---------|----------|
| DKR-01 | `docker-compose.prod.yml` mounts `./infra/nginx/nginx.conf`, `conf.d/`, `certs/` — **these paths do not exist** in the repository | **Blocker** |
| DKR-02 | Compose healthchecks use `wget`; API image does not install `wget` (Dockerfile uses Node HTTP check instead) — compose healthchecks may fail permanently | **High** |
| DKR-03 | No `prisma migrate deploy` step in compose startup — API/WebSocket start without applying migrations | **High** |
| DKR-04 | No persistent volume for API `uploads/` (clips, eBooks, announcements media) — content lost on container recreate | **High** |
| DKR-05 | Redis has no password/TLS in compose — acceptable for private network only | Medium |
| DKR-06 | Postgres backup mount `./infra/postgres/backups` referenced but directory/scripts absent | **High** |

---

## 3. Database migrations

| Item | Status |
|------|--------|
| Migration count | 14 under `services/api/prisma/migrations/` |
| Local `prisma migrate status` | Database schema is up to date |
| Deploy script | `scripts/deploy/run-migrations.mjs` runs `migrate deploy` + schema diff |
| CI validation | `_deploy-reusable.yml` runs `scripts/prisma/validate-schema-diff.mjs` |
| Rollback | Documented in `MIGRATION_RECONCILIATION_REPORT.md`; no automated down migrations |

**Finding:** Migration tooling is production-ready; execution must be **first step** in every deploy (not automated in Docker compose).

---

## 4. Prisma schema consistency

- **Schema:** 29 models in `services/api/prisma/schema.prisma`
- **Validation:** `scripts/prisma/validate-schema-diff.mjs` deploys migrations then runs `prisma migrate diff --exit-code`
- **Prisma version note:** CLI reports 5.22.0 with 7.x available — pin/upgrade deliberately before prod (Low)

---

## 5. Firebase configuration

### Backend (Firebase Admin)

- Loader: `firebase-admin-credentials.loader.ts` — JSON env → file → split `FCM_*`
- Graceful degradation: API starts without credentials; push disabled with warning
- Health: no dedicated `/health/firebase` endpoint (startup log only)

### Mobile

- `android/app/google-services.json` — **present**
- `ios/Runner/GoogleService-Info.plist` — **present**
- Build uses `--dart-define=API_BASE_URL=...` (see `scripts/beta/build-mobile-staging.mjs`)

| ID | Finding | Severity |
|----|---------|----------|
| FB-01 | Production `FIREBASE_SERVICE_ACCOUNT_JSON` (or equivalent) not configured | **High** |
| FB-02 | No production mobile build script (staging only) | Medium |
| FB-03 | iOS APNs linkage in Firebase Console not verifiable from repo | Medium |

---

## 6. FCM configuration

- Provider: `FcmProvider` via Firebase Admin SDK (`firebase-admin@^13.10.0`, Node 20 compatible)
- Token registration requires authenticated mobile session (by design)
- Without credentials: push attempts fail; in-app + websocket notifications still work

**Readiness:** Implementation complete; **credentials required** for production push (High).

---

## 7. SMTP configuration

- Selection: `SMTP_HOST` set → real SMTP; else `MOCK_SMTP` (logs only)
- Health: `GET /api/v1/health/email`
- Readiness service performs connection test on demand

| ID | Finding | Severity |
|----|---------|----------|
| SMTP-01 | No SMTP credentials in production template values | **High** |
| SMTP-02 | Password reset / transactional email will not deliver until configured | **High** |

---

## 8. Flutterwave configuration

- Primary payment provider; checkout, redirect, verify, webhooks implemented
- Health: `GET /api/v1/health/flutterwave`
- Required: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `PAYMENT_REDIRECT_BASE_URL`

| ID | Finding | Severity |
|----|---------|----------|
| PAY-01 | Production Flutterwave keys not configured or live-validated | **High** |
| PAY-02 | Webhook URL must be registered in Flutterwave dashboard pointing to public API | Medium |
| PAY-03 | `PAYMENT_REDIRECT_BASE_URL` must be public API base (not admin URL) | Medium |

---

## 9. Admin-web production build

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** — compiled successfully, 20 routes |
| Dockerfile | Node 20 Alpine, `next start -p 3001` |
| Env at build time | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WEBSOCKET_URL` baked into client bundle |

**Note:** Rebuild admin-web whenever public API/WS URLs change.

---

## 10. Mobile production configuration

| Item | Status |
|------|--------|
| Env template | `apps/mobile-flutter/.env.example` |
| Staging template | `.env.staging.example` |
| Production build script | **Missing** — only `scripts/beta/build-mobile-staging.mjs` |
| API URL injection | `--dart-define=API_BASE_URL=...` at build time |
| Firebase native config | Present for Android/iOS |
| Store release | Not automated in CI |

| ID | Finding | Severity |
|----|---------|----------|
| MOB-01 | No `build-mobile-production.mjs` or documented prod dart-define values | Medium |
| MOB-02 | Production API URL must match TLS certificate and CORS (mobile uses bearer auth, not browser CORS) | Low |

---

## 11. Security headers

### API (`services/api/src/main.ts`)

- **Helmet** enabled globally; CSP enabled by default in prod-like mode
- **Compression** enabled
- **Trust proxy** set to `1` in prod-like mode
- **Correlation ID** via `X-Correlation-Id`
- **Direct eBook file access** blocked on static upload path

### Admin-web

- No `next.config.js` / security headers configuration
- Relies on reverse proxy (nginx) — which is **missing** (Blocker DKR-01)
- Middleware handles auth/RBAC routing only

| ID | Finding | Severity |
|----|---------|----------|
| SEC-H-01 | Admin-web lacks explicit security headers in Next.js config | Medium |
| SEC-H-02 | Uploads served via `express.static` on API — ensure nginx blocks direct public access in prod | Medium |

---

## 12. CORS configuration

```typescript
// buildCorsOrigin() — production/staging without CORS_ORIGIN → false (deny all)
app.enableCors({ origin: buildCorsOrigin(), credentials: true, ... });
```

| ID | Finding | Severity |
|----|---------|----------|
| CORS-01 | `CORS_ORIGIN` must be exact admin origin(s), comma-separated for multiple | Medium |
| CORS-02 | Fail-closed behavior is correct for prod — misconfiguration causes total admin API failure (fail-safe) | Low |

---

## 13. Rate limiting

- Global: `ThrottlerGuard` — `RATE_LIMIT_TTL_MS` (default 60s), `RATE_LIMIT_LIMIT` (default 100)
- Auth endpoints: stricter per-route limits (3–10 req/min on login, forgot-password, etc.)
- Tests: `auth.rate-limit.spec.ts`

| ID | Finding | Severity |
|----|---------|----------|
| RL-01 | Env template variable names don't match runtime (`THROTTLE_*` vs `RATE_LIMIT_*`) | Medium |
| RL-02 | WebSocket/realtime not covered by HTTP throttler — separate concern | Low |

---

## 14. Logging and monitoring

| Component | Status |
|-----------|--------|
| HTTP logging | Pino with auth header redaction |
| Metrics | Prometheus at `/metrics` (token-gated in prod) |
| Sentry | Optional via `SENTRY_DSN` |
| Observability stack | `infrastructure/prometheus`, Grafana, Alertmanager configs present |
| Health endpoints | `/api/v1/health`, `/health/email`, `/health/flutterwave`, realtime health |
| Deploy verification | `scripts/deploy/verify-health.mjs` |

| ID | Finding | Severity |
|----|---------|----------|
| OBS-01 | Observability stack not wired into `docker-compose.prod.yml` | Medium |
| OBS-02 | Sentry not documented in production env template | Low |
| OBS-03 | Deploy health URLs in workflow still use `example.com` placeholders | Medium |

---

## 15. Backup strategy

| Item | Status |
|------|--------|
| DR plan | `docs/disaster-recovery.md` (RTO 60m, RPO 15m) |
| Runbooks | `docs/runbooks/postgres-outage.md`, etc. |
| Automated backup job | **Not implemented** |
| Restore drill | Documented in checklists; **not evidenced** |
| Redis backup | AOF enabled in prod compose |

| ID | Finding | Severity |
|----|---------|----------|
| BAK-01 | No `pg_dump` cron, WAL archiving, or managed-DB backup verification in repo | **High** |
| BAK-02 | Uploads volume not persisted — media not included in DB backups | **High** |
| BAK-03 | Rollback script is placeholder only | **Blocker** (with CI deploy) |

---

## Findings summary

### Blockers (4)

| ID | Finding |
|----|---------|
| **BLK-001** | Missing `infra/nginx/` configs referenced by `docker-compose.prod.yml` — reverse-proxy cannot start |
| **BLK-002** | GitHub Actions deploy step is placeholder (`_deploy-reusable.yml` — no provider integration) |
| **BLK-003** | Rollback hook is placeholder (`scripts/deploy/rollback.mjs`) |
| **BLK-004** | Production `.env.production` with real secrets not provisioned (JWT, DB, CORS minimum) |

### High (12)

ENV-01, ENV-04, DKR-02, DKR-03, DKR-04, DKR-06, FB-01, SMTP-01/02, PAY-01, BAK-01, BAK-02

### Medium (11)

ENV-02, ENV-05, DKR-05, FB-02/03, PAY-02/03, MOB-01, SEC-H-01/02, CORS-01, RL-01, OBS-01/03

### Low (5)

ENV-03, OBS-02, RL-02, CORS-02, MOB-02, Prisma version note

---

## Readiness score

| Category | Weight | Score |
|----------|--------|-------|
| Application code & builds | 25% | 23/25 |
| Infrastructure & Docker | 20% | 8/20 |
| Data layer | 15% | 14/15 |
| Integrations (FCM/SMTP/Payments) | 20% | 8/20 |
| Security controls | 10% | 8/10 |
| Ops (backup, deploy, monitoring) | 10% | 3/10 |
| **Total** | | **64%** |

---

## Deployment order

**Blockers exist — do not cut over until BLK-001 through BLK-004 are resolved.**

Once blockers are cleared, use this exact sequence:

### Phase 0 — Prerequisites
1. Provision managed PostgreSQL (or start compose Postgres) and Redis
2. Create `.env.production` from `.env.production.example` with real secrets
3. Add nginx configs / TLS certs OR use managed load balancer
4. Configure automated Postgres backups + upload storage (S3/NFS volume)

### Phase 1 — Database
```bash
# Against production DATABASE_URL
node scripts/deploy/run-migrations.mjs
# Optional: node scripts/prisma/validate-schema-diff.mjs
```

### Phase 2 — Redis
1. Start Redis (or verify managed instance reachable)
2. Confirm `REDIS_URL` and `REDIS_ADAPTER_ENABLED=true` for API + WebSocket

### Phase 3 — API
1. Build and deploy API container (`services/api/Dockerfile`)
2. Deploy WebSocket service (`WEBSOCKET_ONLY_MODE=true`, port 4100)
3. Verify:
   - `GET /api/v1/health` → 200
   - `GET /api/v1/health/email` → expected status
   - `GET /api/v1/health/flutterwave` → expected status
   - `GET /metrics` with `METRICS_AUTH_TOKEN`

### Phase 4 — Admin dashboard
1. Build with production `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WEBSOCKET_URL`
2. Deploy admin-web container
3. Verify login, RBAC routes, and CORS from admin origin

### Phase 5 — Mobile app release
1. Set production `API_BASE_URL` dart-define to public API URL
2. Ensure `google-services.json` / `GoogleService-Info.plist` match production Firebase project
3. Build release binaries:
   ```bash
   cd apps/mobile-flutter
   flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com/api/v1
   flutter build ipa --release --dart-define=API_BASE_URL=https://api.example.com/api/v1
   ```
4. Submit to Play Console / App Store after smoke tests against production API

---

## Related documents

- `PRODUCTION_CHECKLIST.md` — operator checklist
- `SECURITY_REVIEW.md` — deployment security review
- `RELEASE_READINESS_REPORT.md` — defect posture (P0/P1/P2)
- `FCM_SETUP_REPORT.md`, `SMTP_READINESS_REPORT.md`, `FLUTTERWAVE_READINESS_REPORT.md`
- `docs/disaster-recovery.md`
