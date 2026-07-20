# Closed Beta Readiness Checklist

**Review date:** 2026-06-19  
**Scope:** Pre-invite validation for closed beta deployment  
**Related:** `DEPLOYMENT_RUNBOOK.md`, `ROLLBACK_RUNBOOK.md`, `BACKUP_RESTORE_VALIDATION.md`, `docs/PRODUCTION_SECRETS.md`

---

## How to use this document

Complete every **Gate** item before inviting closed beta testers. **Track** items should be verified during the first beta week. Mark each row: ☐ pending · ☑ done · ⚠ waived (with owner sign-off).

---

## Executive validation summary

| # | Area | Repo / docs | Ops / host | Beta gate |
|---|------|-------------|------------|-----------|
| 1 | Deployment runbook | ☑ Complete | ☐ Stack not boot-tested on target host | **Gate** |
| 2 | Rollback runbook | ☑ Complete | ☐ No evidenced rollback drill | **Gate** |
| 3 | Backup & restore | ☑ Scripts + docs | ☐ No restore drill logged | **Gate** |
| 4 | Production env vars | ☑ Templates + validation | ☐ Real secrets not provisioned | **Gate** |
| 5 | Payment (Flutterwave) | ☑ Code + tests | ☐ Credentials not configured live | **Gate** |
| 6 | Firebase / FCM | ☑ Code + mobile plumbing | ☐ Prod credentials unset | **Gate** |
| 7 | SMTP | ☑ Code + health endpoint | ☐ Uses MockSmtp without SMTP_HOST | **Gate** |
| 8 | Upload storage persistence | ☑ Volume in compose | ☐ Verify after first deploy | **Track** |
| 9 | WebSocket deployment | ☑ Service + nginx | ☑ Clients use API host (see note) | **Track** |
| 10 | Mobile production config | ☑ Staging build script | ☐ Beta APK/IPA not built for target API | **Gate** |

---

## 1. Deployment runbook completeness

**Verdict:** ☑ Complete in repository · ☐ Host execution pending

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| DEP-01 | `DEPLOYMENT_RUNBOOK.md` covers pre-deploy, env, migrations, compose, nginx, health, mobile | ☑ | Phases 0–7 documented |
| DEP-02 | CI deploy workflow is real (not placeholder) | ☑ | `.github/workflows/_deploy-reusable.yml`, `scripts/deploy/deploy.mjs` |
| DEP-03 | Migration path documented (`run-migrations.mjs` + compose `migrate` service) | ☑ | Runbook Phase 2 |
| DEP-04 | Production secrets validation at deploy | ☑ | `scripts/env/validate-production-secrets.mjs` |
| DEP-05 | Nginx configs for API, admin, WebSocket | ☑ | `infra/nginx/conf.d/*.server.conf` |
| DEP-06 | End-to-end compose boot on deploy target | ☐ | Not validated on audit host (no Docker daemon) |
| DEP-07 | Post-deploy smoke (`verify-health.mjs`, admin login, mobile login) | ☐ | Run after first staging deploy |

**Gate:** DEP-06 and DEP-07 must pass on staging before beta invite.

---

## 2. Rollback runbook completeness

**Verdict:** ☑ Complete in repository · ☐ Drill pending

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| RB-01 | `ROLLBACK_RUNBOOK.md` documents scope (API, WS, admin, nginx, DB) | ☑ | Automated vs manual clearly split |
| RB-02 | `scripts/deploy/rollback.mjs` + release state tracking | ☑ | `.deploy/release-state.json` |
| RB-03 | Health verification after rollback | ☑ | `verify-health.mjs` referenced |
| RB-04 | Database forward-only rollback policy documented | ☑ | Runbook §Database rollback |
| RB-05 | Rollback drill on staging (deploy → rollback → health) | ☐ | No test log entry |

**Gate:** RB-05 on staging after first successful deploy.

---

## 3. Backup and restore procedures

**Verdict:** ☑ Documented · ☐ Restore drill not evidenced

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| BAK-01 | Postgres backup script | ☑ | `scripts/backup/postgres-backup.mjs` |
| BAK-02 | Uploads backup script | ☑ | `scripts/backup/uploads-backup.mjs` |
| BAK-03 | Restore scripts + validation | ☑ | `restore-postgres.mjs`, `validate-restore.mjs` |
| BAK-04 | Cron schedule documented | ☑ | `BACKUP_RESTORE_VALIDATION.md` |
| BAK-05 | RPO/RTO documented | ☑ | 15 min / 60 min in `docs/disaster-recovery.md` |
| BAK-06 | Staging restore drill (postgres) | ☐ | Test log empty |
| BAK-07 | Staging restore drill (uploads) | ☐ | Test log empty |

**Gate:** BAK-06 minimum before beta; BAK-07 before media-heavy beta scenarios.

---

## 4. Production environment variables

**Verdict:** ☑ Templates + startup validation · ☐ Host secrets pending

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| ENV-01 | `.env.production.example` complete | ☑ | All integration vars present |
| ENV-02 | `docs/PRODUCTION_SECRETS.md` documents ownership | ☑ | |
| ENV-03 | API rejects placeholders in production | ☑ | `security-config.validation.ts` |
| ENV-04 | Deploy materialization script | ☑ | `materialize-production-env.mjs` |
| ENV-05 | Pre-deploy validation passes on target | ☐ | Run: `node scripts/env/validate-production-secrets.mjs --mode=production` |
| ENV-06 | Beta env validation passes | ☐ | Run: `node scripts/beta/validate-beta-env.mjs` |

**Required production secrets (minimum):**

- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars)
- `CORS_ORIGIN`, `CONTENT_ACCESS_SECRET`, `METRICS_AUTH_TOKEN`
- `API_PUBLIC_URL`, `NEXT_PUBLIC_API_BASE_URL`
- `POSTGRES_*` (if using compose postgres)

**Gate:** ENV-05 and ENV-06 on staging/production host.

---

## 5. Payment configuration (Flutterwave)

**Verdict:** ☑ Implementation ready · ☐ Live config FAIL

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| PAY-01 | Checkout, webhook, entitlement flows implemented | ☑ | `FLUTTERWAVE_READINESS_REPORT.md` |
| PAY-02 | Unit tests pass | ☑ | 17/17 payment tests |
| PAY-03 | Health endpoint `GET /api/v1/health/flutterwave` | ☑ | |
| PAY-04 | `FLUTTERWAVE_SECRET_KEY` configured | ☐ | |
| PAY-05 | `FLUTTERWAVE_WEBHOOK_SECRET` configured | ☐ | |
| PAY-06 | `PAYMENT_REDIRECT_BASE_URL` points to public HTTPS URL | ☐ | |
| PAY-07 | Webhook URL registered in Flutterwave dashboard | ☐ | `{API_PUBLIC_URL}/api/v1/payments/webhooks/flutterwave` |
| PAY-08 | Sandbox checkout + webhook end-to-end test | ☐ | |

**Gate:** If beta includes paid subscriptions or ebook purchases, PAY-04 through PAY-08 are mandatory.  
**Waive:** If beta is free-tier only, document waiver and disable checkout CTAs in release notes.

---

## 6. Firebase / FCM configuration

**Verdict:** ☑ Backend + mobile plumbing · ☐ Prod credentials unset

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| FCM-01 | Firebase Admin SDK integrated | ☑ | `FCM_SETUP_REPORT.md` |
| FCM-02 | Credential resolution (JSON / file / split) | ☑ | |
| FCM-03 | Mobile packages + token lifecycle API | ☑ | register / refresh / revoke |
| FCM-04 | `google-services.json` (Android) present | ☑ | Verify not committed secrets |
| FCM-05 | `GoogleService-Info.plist` (iOS) present | ☑ | |
| FCM-06 | Production Firebase Admin credentials on API | ☐ | |
| FCM-07 | APNs configured in Firebase (iOS push) | ☐ | |
| FCM-08 | Push delivery test (announcement → device) | ☐ | |

**Gate:** FCM-06 + FCM-08 for push-dependent beta; in-app notifications work without FCM.

---

## 7. SMTP configuration

**Verdict:** ☑ Implementation ready · ☐ Live SMTP FAIL

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| SMTP-01 | Nodemailer provider + templates | ☑ | `SMTP_READINESS_REPORT.md` |
| SMTP-02 | Health endpoint `GET /api/v1/health/email` | ☑ | |
| SMTP-03 | `SMTP_HOST` + `SMTP_FROM` configured | ☐ | Without SMTP_HOST → MockSmtpProvider |
| SMTP-04 | `WEB_APP_URL` + `APP_NAME` for email links | ☐ | |
| SMTP-05 | Password reset email delivered to real inbox | ☐ | |
| SMTP-06 | SPF/DKIM/DMARC for sending domain | ☐ | DNS / provider setup |

**Gate:** SMTP-03 and SMTP-05 if beta includes self-service password reset or email verification.

---

## 8. Upload storage persistence

**Verdict:** ☑ Implemented · ☐ Post-deploy verification pending

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| UPL-01 | Named Docker volume `uploads_prod_data` | ☑ | `docker-compose.prod.yml` |
| UPL-02 | Volume mounted on `api` and `websocket` services | ☑ | Shared path `/app/uploads` |
| UPL-03 | Upload backup includes volume | ☑ | `uploads-backup.mjs` |
| UPL-04 | Clip/ebook upload → container restart → asset still loads | ☐ | Post-deploy smoke |
| UPL-05 | Nginx 100MB upload limit on API | ☑ | `api.server.conf` |

**Track:** UPL-04 during beta smoke (see `BETA_TEST_PLAN.md`).

---

## 9. WebSocket deployment

**Verdict:** ☑ Infrastructure ready · ⚠ Client routing note

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| WS-01 | Dedicated `websocket` service in compose (port 4100) | ☑ | `docker-compose.prod.yml` |
| WS-02 | Nginx WebSocket upgrade config | ☑ | `websocket.server.conf` |
| WS-03 | API also serves Socket.IO on port 4000 | ☑ | Full NestJS app on both containers |
| WS-04 | Admin client connects via API base URL | ☑ | `socket-client.ts` → `{API_HOST}/realtime` |
| WS-05 | Mobile realtime derives from `API_BASE_URL` | ☑ | `realtime_notifications_service.dart` |
| WS-06 | `NEXT_PUBLIC_WEBSOCKET_URL` unused by admin socket client | ⚠ | Documented; ws subdomain optional for beta |
| WS-07 | `WEBSOCKET_ONLY_MODE` in compose | ⚠ | Env var not read by API runtime — both services run full app |
| WS-08 | Realtime connect + announcement event on staging | ☐ | Post-deploy smoke |

**Production recommendation:** Route Socket.IO through the apex host (`https://woppandmopp.com/realtime`). Legacy `ws.woppandmopp.com` redirects to this path.

**Gate:** WS-08 on staging.

---

## 10. Mobile production configuration

**Verdict:** ☑ Documented · ☐ Beta build pending

| ID | Check | Status | Evidence / notes |
|----|-------|--------|------------------|
| MOB-01 | Staging build helper script | ☑ | `scripts/beta/build-mobile-staging.mjs` |
| MOB-02 | `API_BASE_URL` via `--dart-define` documented | ☑ | `.env.staging.example` |
| MOB-03 | Firebase native files for push | ☑ | See FCM section |
| MOB-04 | `validate-mobile-firebase.mjs` | ☑ | Pre-build check |
| MOB-05 | Release APK/AAB or TestFlight build for beta API URL | ☐ | |
| MOB-06 | Physical device smoke (login, content, notifications) | ☐ | `DEVICE_SMOKE_TEST_PLAN.md` |
| MOB-07 | Dedicated `build-mobile-production.mjs` | ☐ | Waived — use staging script with prod URL |

**Gate:** MOB-05 and MOB-06 before distributing to testers.

---

## Pre-invite gate checklist (summary)

All must be ☑ before sending beta invites:

- [ ] Staging/production stack deployed and healthy (`DEP-06`, `DEP-07`)
- [ ] Production secrets validated (`ENV-05`, `ENV-06`)
- [ ] At least one postgres backup + restore drill on staging (`BAK-06`)
- [ ] Rollback drill on staging (`RB-05`)
- [ ] WebSocket smoke on staging (`WS-08`)
- [ ] Mobile beta build pointed at staging API (`MOB-05`, `MOB-06`)
- [ ] SMTP configured if password reset in scope (`SMTP-03`, `SMTP-05`)
- [ ] Flutterwave configured if payments in scope (`PAY-04`–`PAY-08`)
- [ ] FCM configured if push in scope (`FCM-06`, `FCM-08`)

---

## Sign-off

| Role | Name | Date | Gate cleared |
|------|------|------|--------------|
| Engineering lead | | | ☐ |
| DevOps / release | | | ☐ |
| Product owner | | | ☐ |

---

## Related documents

- `BETA_TEST_PLAN.md` — tester and QA execution plan
- `BETA_FEEDBACK_TEMPLATE.md` — structured tester feedback
- `RELEASE_READINESS_REPORT.md` — application defect status (P0/P1/P2 = 0)
- `INFRA_REMEDIATION_REPORT.md` — infrastructure blocker resolution
