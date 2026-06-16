# P0 Closure Plan — Beta Launch

**Date:** June 11, 2026  
**Source reports:** [PRE_BETA_COMPLETION_REPORT.md](PRE_BETA_COMPLETION_REPORT.md), [BETA_GO_NO_GO_REPORT.md](BETA_GO_NO_GO_REPORT.md)  
**Setup reference:** [docs/pre-beta/EXTERNAL_SETUP.md](docs/pre-beta/EXTERNAL_SETUP.md)  
**Phase A runbook (copy-paste):** [docs/pre-beta/PHASE_A_RUNBOOK.md](docs/pre-beta/PHASE_A_RUNBOOK.md)

---

## Executive Summary

| Metric | Current | Beta target |
|--------|---------|-------------|
| **Decision** | **NO-GO** | **CONDITIONAL GO** (invite-only) |
| `validate-beta-env.mjs` | **Exit 1** — 2 FAIL, 1 WARN | Exit 0, zero FAIL |
| `validate-mobile-firebase.mjs` | **82% (9/11)** — Exit 1 | **100% (11/11)** — Exit 0 |
| `validate-pre-beta.mjs` | **Exit 1** — 4 PASS, 7 FAIL, 6 MANUAL | Exit 0 or 2 (manual only) |
| Code / automated tests | **PASS** (131/131 API, 9/9 beta smoke) | Unchanged |

**Progress since pre-beta report:** Android `google-services.json` is now present (+1 mobile check). SMTP, Flutterwave, stream secrets, iOS plist, and Firebase Admin remain open.

**Estimated closure time:** **1–2 business days** with all credentials in hand; **3–5 business days** if waiting on SMTP domain verification, Flutterwave sandbox approval, or Apple APNs key provisioning.

---

## 1. Failing Validator Results (Latest Run)

### `node scripts/beta/validate-beta-env.mjs` — **FAIL (exit 1)**

| Check | Status | Detail |
|-------|--------|--------|
| SMTP configuration | **FAIL** | `SMTP_HOST` not set; MockSmtpProvider active |
| Stream token configuration | **WARN** | `CONTENT_ACCESS_SECRET` missing or &lt;32 chars |
| Upload proxy configuration | **PASS** | Direct PDF path blocked |
| Flutterwave configuration | **FAIL** | Missing `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `PAYMENT_REDIRECT_BASE_URL` |

### `node scripts/beta/validate-mobile-firebase.mjs` — **FAIL (exit 1, 82%)**

| Check | Status |
|-------|--------|
| Android `google-services.json` | **PASS** |
| Android example template | **PASS** |
| Google Services Gradle (settings + app) | **PASS** |
| Android `POST_NOTIFICATIONS` | **PASS** |
| iOS `GoogleService-Info.plist` | **FAIL** |
| iOS example template | **PASS** |
| iOS remote-notification background mode | **PASS** |
| Firebase Admin credentials | **FAIL** |
| iOS push entitlements | **PASS** |
| Mobile staging template | **PASS** |

### `node scripts/beta/validate-pre-beta.mjs` — **FAIL (exit 1)**

| Status | Count | Items |
|--------|-------|-------|
| **PASS** | 4 | DB seed, Android Firebase file, mobile API URL doc, iOS entitlements code |
| **FAIL** | 7 | SMTP, Flutterwave env, stream secrets, iOS plist, Firebase Admin, both env validators |
| **MANUAL** | 6 | Flutterwave webhook live test, admin banner, APNs, Android device, iOS device, full E2E |

---

## 2. Remaining Items by Category

### SMTP

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| S1 | Set `SMTP_HOST`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` in `services/api/.env` | **FAIL** | External SMTP account |
| S2 | Set `APP_NAME`, `WEB_APP_URL` for email templates | Recommended | Staging admin URL |
| S3 | Send test welcome + password-reset emails on staging | **MANUAL** | Depends on S1 + staging deploy |
| S4 | `validate-beta-env.mjs` → SMTP **PASS** | **FAIL** | Depends on S1 |

### Flutterwave

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| F1 | Set `FLUTTERWAVE_SECRET_KEY` (test/sandbox) | **FAIL** | Flutterwave dashboard account |
| F2 | Set `FLUTTERWAVE_WEBHOOK_SECRET` | **FAIL** | Flutterwave dashboard |
| F3 | Set `PAYMENT_REDIRECT_BASE_URL` to staging API base | **FAIL** | Staging API URL known |
| F4 | Register webhook URL in Flutterwave dashboard | **MANUAL** | Public staging HTTPS endpoint |
| F5 | Complete test checkout + confirm webhook activates entitlement | **MANUAL** | F1–F4 |
| F6 | `validate-beta-env.mjs` → Flutterwave **PASS** | **FAIL** | Depends on F1–F3 |

### Stream Tokens

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| T1 | Generate `CONTENT_ACCESS_SECRET` (≥32 random chars) | **FAIL** | None — can generate locally |
| T2 | Set `API_PUBLIC_URL` to staging public host | **FAIL** | Staging API URL known |
| T3 | Smoke-test eBook stream on device | **MANUAL** | T1–T2 + purchase flow |
| T4 | Confirm unauthenticated `/api/v1/uploads/ebooks/file/*` → **403** | **MANUAL** | Staging deploy |
| T5 | `validate-beta-env.mjs` → Stream token **PASS** | **WARN** | Depends on T1–T2 |

### Firebase

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| FB1 | Android `google-services.json` | **PASS** | — |
| FB2 | iOS `GoogleService-Info.plist` | **FAIL** | Firebase Console iOS app |
| FB3 | Firebase Admin on API (`FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*`) | **FAIL** | Firebase service account JSON |
| FB4 | APNs `.p8` key uploaded to Firebase Console | **MANUAL** | Apple Developer account |
| FB5 | Xcode Push Notifications capability (entitlements in repo) | **PASS** (code) | Physical iOS device for test |
| FB6 | `validate-mobile-firebase.mjs` → **100%** | **FAIL** | Depends on FB2, FB3 |

### Staging Database

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| D1 | `DATABASE_URL` points to staging PostgreSQL | **MANUAL** on staging | Staging DB host + credentials |
| D2 | Run `node scripts/beta/setup-staging-db.mjs` against staging | **MANUAL** | D1 |
| D3 | Run `node scripts/beta/verify-policy-seed.mjs` → **PASS** | **PASS** locally | Repeat on staging (D2) |
| D4 | Admin Policies publish-readiness banner green | **MANUAL** | D2 + admin login to staging |

### Manual QA

| ID | Item | Status | Blocker type |
|----|------|--------|--------------|
| Q1 | Android device: FCM token register + push receive + tap deep-link | **MANUAL** | FB1, FB3, staging build |
| Q2 | iOS device: FCM token register + push receive + tap deep-link | **MANUAL** | FB2–FB4, FB3, staging build |
| Q3 | Full E2E: register → email → policies → purchase → eBook read | **MANUAL** | All config + devices |
| Q4 | Flutterwave live webhook event (not just unit test) | **MANUAL** | F4–F5 |
| Q5 | `validate-pre-beta.mjs` exit 0 or 2 with zero FAIL | **FAIL** | All above |

---

## 3. Step-by-Step Execution Checklist (Priority Order)

Execute in this order to minimize rework. Parallel tracks noted where safe.

### Phase A — Foundation (no external accounts) · **~45 min**

| Step | Action | Category | Est. time | Validator proof |
|------|--------|----------|-----------|-----------------|
| **A1** | Confirm staging API public URL (e.g. `https://staging-api.example.com`) | Staging DB | 15 min | Used in F3, T2, F4 |
| **A2** | Generate `CONTENT_ACCESS_SECRET` (≥32 chars): `openssl rand -base64 32` | Stream Tokens | 5 min | — |
| **A3** | Add to `services/api/.env`: `CONTENT_ACCESS_SECRET`, `API_PUBLIC_URL` | Stream Tokens | 5 min | Stream token → **PASS** |
| **A4** | Point `DATABASE_URL` at staging PostgreSQL; run `node scripts/beta/setup-staging-db.mjs` | Staging Database | 20 min | `verify-policy-seed.mjs` **PASS** on staging |
| **A5** | Re-run `node scripts/beta/validate-beta-env.mjs` | — | 2 min | Stream **PASS**; SMTP/Flutterwave still FAIL |

### Phase B — Email (SMTP) · **~1–4 hours**

| Step | Action | Category | Est. time | External blocker |
|------|--------|----------|-----------|------------------|
| **B1** | Provision SMTP provider (SendGrid, SES, Mailgun, etc.) | SMTP | 30 min–4 hr | **SMTP account + sender domain verification** |
| **B2** | Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_NAME`, `WEB_APP_URL` to staging `.env` | SMTP | 15 min | B1 |
| **B3** | Restart staging API | SMTP | 5 min | Deploy access |
| **B4** | Register test user; confirm welcome email received | SMTP | 15 min | B2 |
| **B5** | Trigger forgot-password; confirm reset email | SMTP | 10 min | B2 |
| **B6** | Re-run `validate-beta-env.mjs` | SMTP | 2 min | SMTP → **PASS** |

### Phase C — Payments (Flutterwave) · **~2 hours**

| Step | Action | Category | Est. time | External blocker |
|------|--------|----------|-----------|------------------|
| **C1** | Flutterwave Dashboard → copy test **Secret Key** | Flutterwave | 15 min | **Flutterwave merchant account** |
| **C2** | Set webhook secret hash in dashboard | Flutterwave | 10 min | C1 |
| **C3** | Add `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `PAYMENT_REDIRECT_BASE_URL` to staging `.env` | Flutterwave | 10 min | A1, C1–C2 |
| **C4** | Restart staging API | Flutterwave | 5 min | Deploy access |
| **C5** | Register webhook: `{staging-api}/api/v1/payments/webhooks/flutterwave` | Flutterwave | 15 min | **Public HTTPS staging URL** |
| **C6** | Complete one test subscription or eBook checkout in browser | Flutterwave | 30 min | C3–C5 |
| **C7** | Confirm webhook received; entitlement/subscription **ACTIVE** in DB | Flutterwave | 15 min | C6 |
| **C8** | Re-run `validate-beta-env.mjs` | Flutterwave | 2 min | Flutterwave → **PASS**, **exit 0** |

### Phase D — Firebase server + iOS native · **~1–2 hours**

| Step | Action | Category | Est. time | External blocker |
|------|--------|----------|-----------|------------------|
| **D1** | Firebase Console → Project Settings → Service accounts → generate JSON | Firebase | 15 min | **Firebase project owner access** |
| **D2** | Set `FIREBASE_SERVICE_ACCOUNT_JSON={...}` (or `FCM_*` trio) on staging API `.env` | Firebase | 10 min | D1 |
| **D3** | Restart staging API; publish test announcement → push send succeeds (no FCM error in logs) | Firebase | 20 min | D2 |
| **D4** | Firebase Console → add iOS app → download `GoogleService-Info.plist` | Firebase | 15 min | Bundle ID `com.example.ministryMobile` |
| **D5** | Place at `apps/mobile-flutter/ios/Runner/GoogleService-Info.plist` | Firebase | 5 min | D4 |
| **D6** | Apple Developer → create APNs Auth Key (`.p8`); upload to Firebase → Cloud Messaging | Firebase | 45 min | **Apple Developer Program ($99/yr)** |
| **D7** | Re-run `validate-mobile-firebase.mjs` | Firebase | 2 min | **100% (11/11)**, **exit 0** |

### Phase E — Mobile staging builds · **~1 hour**

| Step | Action | Category | Est. time | External blocker |
|------|--------|----------|-----------|------------------|
| **E1** | `node scripts/beta/build-mobile-staging.mjs https://{staging-api}/api/v1` | Manual QA | 5 min | A1 |
| **E2** | Build + install on Android 13+ physical device | Manual QA | 30 min | FB1, E1 |
| **E3** | Build + install on iOS physical device (Xcode, signing) | Manual QA | 45 min | D4–D6, E1, **Apple signing certs** |

### Phase F — Manual QA sign-off · **~3–4 hours**

| Step | Action | Category | Est. time | Pass criteria |
|------|--------|----------|-----------|---------------|
| **F1** | Admin → Policies: confirm publish-readiness banner **green** | Staging Database | 10 min | Four policy types active on **staging** DB |
| **F2** | Android: login → notification permission → FCM token `POST` 200 | Manual QA | 30 min | Token in DB |
| **F3** | Android: receive push (announcement publish) → tap → correct screen | Manual QA | 30 min | Deep-link route opens |
| **F4** | iOS: same as F2–F3 | Manual QA | 45 min | Parity with Android |
| **F5** | E2E: register → welcome email → accept policies → purchase → read eBook stream | Manual QA | 90 min | Full flow on staging |
| **F6** | Security: `GET /api/v1/uploads/ebooks/file/{id}` unauthenticated → **403** | Stream Tokens | 10 min | No direct PDF leak |
| **F7** | Run `node scripts/beta/validate-pre-beta.mjs` | Manual QA | 2 min | **Exit 0 or 2**, zero FAIL |

---

## 4. Time Estimates Summary

| Category | Items open | Est. time (credentials ready) | Est. time (waiting on accounts) |
|----------|------------|-------------------------------|----------------------------------|
| **Stream Tokens** | 2 env vars | 30 min | 30 min |
| **Staging Database** | Staging host seed + banner | 45 min | 1–2 hr (DB provisioning) |
| **SMTP** | Full config + smoke | 1–2 hr | 4–24 hr (domain DNS) |
| **Flutterwave** | Env + webhook + live test | 2 hr | 4–8 hr (sandbox approval) |
| **Firebase** | Admin + iOS plist + APNs | 1.5 hr | 1–2 days (Apple key) |
| **Manual QA** | Devices + E2E | 3–4 hr | Same |
| **Total critical path** | — | **~1–2 business days** | **~3–5 business days** |

---

## 5. External Account / Credential Blockers

These **cannot** be closed in-repo. Assign an owner before starting Phase B–D.

| Blocker | Required from | Blocks |
|---------|---------------|--------|
| SMTP provider account + verified sender | SendGrid / SES / Mailgun / etc. | Welcome email, password reset, beta E2E |
| Flutterwave merchant + test API keys | Flutterwave Dashboard | Payments, subscriptions, eBook purchase E2E |
| Public staging HTTPS URL | Infra / hosting | Webhook registration, `API_PUBLIC_URL`, mobile `API_BASE_URL` |
| Staging PostgreSQL + `DATABASE_URL` | Cloud DB provider | Policy banner, all staging data |
| Firebase project (owner role) | Google Cloud / Firebase Console | Admin push, iOS plist, service account |
| Apple Developer Program | Apple ($99/yr) | APNs key, iOS push on device |
| iOS code signing cert + provisioning | Apple Developer | iOS device build |
| Physical Android + iOS devices | QA team | FCM smoke, E2E |

---

## 6. Beta Go / No-Go Checklist

### Current state: **NO-GO**

### Flip to **CONDITIONAL GO** only when ALL are true:

#### Automated gates (must pass before device QA)

- [ ] `node scripts/beta/validate-beta-env.mjs` → **exit 0**, zero `[FAIL]` lines
- [ ] `node scripts/beta/validate-mobile-firebase.mjs` → **100% (11/11)**, **exit 0**
- [ ] `node scripts/beta/validate-pre-beta.mjs` → **zero `[FAIL]`** (exit 0 or 2 acceptable if only MANUAL remain)

#### Configuration gates

- [ ] SMTP: welcome + reset emails delivered on staging
- [ ] Flutterwave: test checkout completes; webhook updates DB
- [ ] Stream: `CONTENT_ACCESS_SECRET` + `API_PUBLIC_URL` set; stream read works on device
- [ ] Staging DB: migrate + seed applied; `verify-policy-seed.mjs` **PASS** on staging
- [ ] Firebase Admin: server push send succeeds (no credential errors)
- [ ] Android + iOS native Firebase files present

#### Manual QA gates

- [ ] Admin Policies publish-readiness banner **green** on staging
- [ ] Android: FCM register + push receive + tap deep-link (≥1 module)
- [ ] iOS: FCM register + push receive + tap deep-link (≥1 module)
- [ ] Full E2E on staging: register → email → policies → purchase → eBook read
- [ ] Direct PDF URL returns **403** without auth

#### Known beta limitations (document, do not block GO)

- Background OS notification tray not implemented (foreground/tap routing OK)
- Email verification on registration not required
- Admin Content hub placeholder

---

## 7. Exact Validator Outputs Required

### Beta Ready

Run from repo root against **staging** `services/api/.env`:

```bash
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
node scripts/beta/verify-policy-seed.mjs
cd services/api && npm test -- --testPathPatterns=beta-smoke
```

#### `validate-beta-env.mjs` — Beta Ready

```
[beta:env] mode=staging envFile=.../services/api/.env
[PASS] SMTP configuration: SMTP host configured (...).
[PASS] Stream token configuration: Stream tokens use dedicated secret; public URL https://....
[PASS] Upload proxy configuration: Direct premium PDF path blocked; ...
[PASS] Flutterwave configuration: Flutterwave secret, webhook secret, and redirect base URL are configured.
[beta:env] Beta environment validation passed with no blocking failures.
```

**Exit code: 0** (WARN on stream token is **not** Beta Ready — must be PASS)

#### `validate-mobile-firebase.mjs` — Beta Ready

```
Score: 100% (11/11)
```

**Exit code: 0** — all checks PASS including iOS plist and Firebase Admin

#### `validate-pre-beta.mjs` — Beta Ready

```
Summary: 11 PASS, 0 FAIL, 0 WARN, 6 MANUAL (17 total)
Automated/config checks: 11/11 passing
[validate-pre-beta] Manual steps remain — complete before external beta.
```

**Exit code: 2** (acceptable if zero FAIL) **or 0** after manual QA complete

**Not acceptable:** any line `[FAIL]` or exit code **1**

#### `verify-policy-seed.mjs` — Beta Ready

Exit **0** against staging `DATABASE_URL`

#### `beta-smoke` — Beta Ready

**9/9 PASS**

---

### Production Ready

Beta Ready **plus** all items below (from [BETA_GO_NO_GO_REPORT.md](BETA_GO_NO_GO_REPORT.md) § Production checklist). Production validators are **not yet scripted** — use this checklist until dedicated production validators exist.

| Gate | Requirement |
|------|-------------|
| Beta stability | Invite-only beta stable ≥2 weeks |
| Payment diversity | Paystack/Stripe implemented **or** signed business waiver |
| Clip premium | Public `mediaUrl` gated for premium clips |
| Storage | Premium assets on private object storage (S3/GCS) |
| Subscriptions | Automated grace/expiry job (not manual admin) |
| Security | `npm audit` remediation + penetration test on auth/payments/stream |
| Email | Bounce handling, rate limits, monitoring, failover |
| Account integrity | Email verification or equivalent |
| Firebase | Separate production project + native config files |
| Flutterwave | Production keys + reconciliation runbook |
| Ops | Incident runbooks (payments, email, push, entitlements) |
| Tests | Controller/e2e integration beyond beta smoke |
| Monitoring | Sentry/alerting on webhook failures, email delivery |

#### Production environment validation (target — extend `validate-beta-env.mjs` or add `validate-prod-env.mjs`)

Production `.env` must additionally enforce:

- `NODE_ENV=production`
- No test/sandbox Flutterwave keys
- SMTP production sender with verified domain + DMARC
- `CONTENT_ACCESS_SECRET` unique per environment (≠ staging)
- Separate `FIREBASE_SERVICE_ACCOUNT_JSON` for production project
- `CORS_ORIGIN` locked to production admin origin only
- Secrets injected via secret manager (not plain `.env` on disk)

**Production Ready decision:** separate sign-off after beta + production checklist — **not** implied by beta validator PASS alone.

---

## 8. Priority Execution Order (Quick Reference)

| Priority | Category | Next action | Owner |
|----------|----------|-------------|-------|
| **P0-1** | Stream Tokens | A2–A3: set secrets in staging `.env` | Infra |
| **P0-2** | Staging Database | A4: seed staging PostgreSQL | Infra |
| **P0-3** | SMTP | B1–B6: provision provider + test emails | Infra |
| **P0-4** | Flutterwave | C1–C8: keys + webhook + live checkout | Payments |
| **P0-5** | Firebase | D1–D3: Admin creds + push send test | Infra |
| **P0-6** | Firebase | D4–D5: iOS plist | Mobile |
| **P0-7** | Firebase | D6: APNs `.p8` upload | Mobile + Infra |
| **P0-8** | Manual QA | E1–E3: staging mobile builds | Mobile |
| **P0-9** | Manual QA | F1–F7: device smoke + E2E + final validator | QA |

**Re-run after each phase:**

```bash
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
```

---

*Generated from latest validator run — June 11, 2026*
