# Beta Launch Finalization Report

**Date:** June 15, 2026  
**Scope:** Deployment audit, environment readiness, staging/device verification plans, launch decision  
**No new features** — documentation and sign-off only  
**Sources:** [PRE_BETA_COMPLETION_REPORT.md](PRE_BETA_COMPLETION_REPORT.md) · [BETA_GO_NO_GO_REPORT.md](BETA_GO_NO_GO_REPORT.md) · [MOBILE_INFRASTRUCTURE_READINESS_REPORT.md](MOBILE_INFRASTRUCTURE_READINESS_REPORT.md) · [docs/pre-beta/EXTERNAL_SETUP.md](docs/pre-beta/EXTERNAL_SETUP.md)

---

## Executive Summary

| Field | Value |
|-------|-------|
| **Current decision** | **NO-GO** |
| **Target decision** | **CONDITIONAL GO** (invite-only beta) |
| **Code readiness** | **88%** — automated tests green; infra wired |
| **Deployment readiness** | **62%** — credentials and manual verification incomplete |
| **Production readiness** | **74%** — unchanged; separate checklist |

**Progress since June 11:** Android `google-services.json` is now present (`validate-mobile-firebase.mjs` **82%**, up from 73%). Local DB seed **PASS**. Six blocking FAIL items and six MANUAL steps remain before invite-only beta.

**Run validators before sign-off:**

```bash
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
```

---

## 1. Deployment Audit

Latest run: **June 15, 2026** (repo root, `services/api/.env` present).

### 1.1 `validate-beta-env.mjs`

| Check | Result | Classification | Owner action |
|-------|--------|----------------|--------------|
| SMTP configuration | **FAIL** | **External credential** + **Configuration** | Set `SMTP_HOST`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` in `services/api/.env` |
| Stream token configuration | **WARN** | **Configuration** | Set `CONTENT_ACCESS_SECRET` (≥32 chars) + `API_PUBLIC_URL` |
| Upload proxy configuration | **PASS** | **Code issue** (resolved) | None — direct PDF block in `main.ts` |
| Flutterwave configuration | **FAIL** | **External credential** + **Configuration** | Set `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `PAYMENT_REDIRECT_BASE_URL` |

**Exit code:** 1 · **Blocking FAILs:** 2

### 1.2 `validate-mobile-firebase.mjs`

| Check | Result | Classification | Owner action |
|-------|--------|----------------|--------------|
| Android `google-services.json` | **PASS** | **External credential** (resolved) | None |
| Android `google-services.json.example` | **PASS** | **Code issue** (resolved) | None |
| Google Services Gradle plugin (settings) | **PASS** | **Code issue** (resolved) | None |
| Google Services Gradle plugin (app) | **PASS** | **Code issue** (resolved) | None |
| Android `POST_NOTIFICATIONS` | **PASS** | **Code issue** (resolved) | None |
| iOS `GoogleService-Info.plist` | **FAIL** | **External credential** | Download from Firebase Console → `ios/Runner/GoogleService-Info.plist` |
| iOS `GoogleService-Info.plist.example` | **PASS** | **Code issue** (resolved) | None |
| iOS remote-notification background mode | **PASS** | **Code issue** (resolved) | None |
| Firebase Admin credentials | **FAIL** | **External credential** | Set `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*` on API |
| iOS push entitlements (`aps-environment`) | **PASS** | **Code issue** (resolved) | None |
| Mobile staging API template | **PASS** | **Code issue** (resolved) | Use `build-mobile-staging.mjs` at deploy time |

**Score:** **82% (9/11)** · **Exit code:** 1

### 1.3 `validate-pre-beta.mjs`

| # | Item | Status | Classification |
|---|------|--------|----------------|
| 1 | SMTP configured in staging | **FAIL** | Configuration + External credential |
| 2 | Flutterwave env vars | **FAIL** | Configuration + External credential |
| 3 | Flutterwave webhook registered | **MANUAL** | Manual verification |
| 4 | eBook streaming secrets | **WARN** | Configuration |
| 5 | Database migrate + seed | **PASS** | Manual verification (done locally/staging DB) |
| 6 | Admin publish-readiness banner | **MANUAL** | Manual verification |
| 7 | Firebase Android `google-services.json` | **PASS** | External credential (resolved) |
| 8 | Firebase iOS `GoogleService-Info.plist` | **FAIL** | External credential |
| 9 | APNs key in Firebase + Xcode Push | **MANUAL** | External credential + Manual verification |
| 10 | Firebase Admin on API | **FAIL** | External credential |
| 11 | Mobile staging `API_BASE_URL` documented | **PASS** | Configuration (template exists) |
| 12 | iOS push entitlements file | **PASS** | Code issue (resolved) |
| 13 | `validate-beta-env.mjs` no FAIL | **FAIL** | Manual verification (blocked by #1, #2, #4) |
| 14 | `validate-mobile-firebase.mjs` 100% | **FAIL** | Manual verification (blocked by #8, #10) |
| 15 | Device Android FCM smoke | **MANUAL** | Manual verification |
| 16 | Device iOS FCM smoke | **MANUAL** | Manual verification |
| 17 | Manual E2E staging flow | **MANUAL** | Manual verification |

**Summary:** 4 PASS · 6 FAIL · 1 WARN · 6 MANUAL · **Automated/config: 4/11 passing** · **Exit code:** 1

### 1.4 Classification summary

| Type | Count | Items |
|------|-------|-------|
| **Code issue** | 0 open | All code/infra checks PASS |
| **Configuration issue** | 4 open | SMTP, Flutterwave env, stream secrets, mobile staging URL at build time |
| **External credential issue** | 3 open | iOS plist, Firebase Admin, APNs `.p8` upload |
| **Manual verification issue** | 6 open | Webhook live test, admin banner, Android/iOS device smokes, full E2E |

---

## 2. Environment Readiness

### 2.1 Backend — `services/api/.env`

Copy template: [`.env.staging.example`](.env.staging.example) and [`services/api/.env.example`](services/api/.env.example).

#### SMTP (required — currently FAIL)

| Variable | Example / format | Owner must supply |
|----------|------------------|-------------------|
| `SMTP_HOST` | `smtp.sendgrid.net` | Provider hostname |
| `SMTP_PORT` | `587` | Port (587 TLS or 465 SSL) |
| `SMTP_SECURE` | `false` | `true` if port 465 |
| `SMTP_USER` | `apikey` or mailbox user | SMTP username |
| `SMTP_PASS` | *(secret)* | SMTP password or API key |
| `SMTP_FROM` | `no-reply@yourdomain.com` | Verified sender address |
| `APP_NAME` | `WOP` or `Ministry Platform` | Display name in emails |
| `WEB_APP_URL` | `https://staging-admin.example.com` | Admin URL for email links |

#### Flutterwave (required — currently FAIL)

| Variable | Example / format | Owner must supply |
|----------|------------------|-------------------|
| `FLUTTERWAVE_SECRET_KEY` | `FLWSECK_TEST-xxxxxxxx` | Test secret from Flutterwave dashboard |
| `FLUTTERWAVE_WEBHOOK_SECRET` | *(secret hash)* | Webhook verification hash from dashboard |
| `PAYMENT_REDIRECT_BASE_URL` | `https://staging-api.example.com/api/v1` | Staging API base including `/api/v1` |

**Dashboard action (not in `.env`):** Register webhook URL:

```
https://<STAGING_API_HOST>/api/v1/payments/webhooks/flutterwave
```

#### eBook streaming (required for beta — currently WARN)

| Variable | Example / format | Owner must supply |
|----------|------------------|-------------------|
| `CONTENT_ACCESS_SECRET` | ≥32 random characters | Generate: `openssl rand -base64 32` |
| `API_PUBLIC_URL` | `https://staging-api.example.com` | Public staging API origin (no path) |

#### Firebase Admin (required for push — currently FAIL)

**Option A (recommended):**

| Variable | Owner must supply |
|----------|-------------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON from Firebase Console → Service accounts → Generate new private key |

**Option B:**

| Variable | Owner must supply |
|----------|-------------------|
| `FCM_PROJECT_ID` | Firebase project ID |
| `FCM_CLIENT_EMAIL` | `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` |
| `FCM_PRIVATE_KEY` | PEM private key with `\n` escaped |

#### Already required for staging (verify set on deploy host)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Staging PostgreSQL |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Auth (≥32 chars each) |
| `CORS_ORIGIN` | Staging admin web origin |
| `REDIS_URL` | If realtime enabled |

### 2.2 Mobile

#### Build-time (required)

| Variable / flag | Where | Owner must supply |
|-----------------|-------|-------------------|
| `API_BASE_URL` | `--dart-define` at build | Staging API, e.g. `https://staging-api.example.com/api/v1` |

```bash
node scripts/beta/build-mobile-staging.mjs https://staging-api.example.com/api/v1
cd apps/mobile-flutter && flutter run --dart-define=API_BASE_URL=https://staging-api.example.com/api/v1
```

#### Native Firebase files (not in `.env`)

| File | Platform | Status | Owner must supply |
|------|----------|--------|-------------------|
| `android/app/google-services.json` | Android | **Present** | None (verify package `com.example.ministry_mobile`) |
| `ios/Runner/GoogleService-Info.plist` | iOS | **Missing** | Download from Firebase Console (bundle `com.example.ministryMobile`) |

#### APNs (iOS push — manual)

| Item | Owner must supply |
|------|-------------------|
| APNs Auth Key (`.p8`) | Apple Developer → Keys → APNs enabled |
| Key ID + Team ID | From Apple Developer account |
| Firebase upload | Firebase Console → Cloud Messaging → Apple app configuration |

Template reference: [`apps/mobile-flutter/.env.staging.example`](apps/mobile-flutter/.env.staging.example)

### 2.3 Owner supply checklist (copy-paste)

Use this as the single handoff list. Check each box when supplied to staging `services/api/.env` or mobile build pipeline.

- [ ] Staging API public URL decided: `https://________________/api/v1`
- [ ] Staging admin URL decided: `https://________________`
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` from email provider
- [ ] `FLUTTERWAVE_SECRET_KEY` (test key)
- [ ] `FLUTTERWAVE_WEBHOOK_SECRET` (dashboard hash)
- [ ] `PAYMENT_REDIRECT_BASE_URL` = staging API + `/api/v1`
- [ ] Flutterwave webhook URL registered in dashboard
- [ ] `CONTENT_ACCESS_SECRET` generated (≥32 chars)
- [ ] `API_PUBLIC_URL` = staging API origin
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` (or `FCM_*` trio) from Firebase
- [ ] `GoogleService-Info.plist` placed in `ios/Runner/`
- [ ] APNs `.p8` uploaded to Firebase Console
- [ ] Mobile builds use `--dart-define=API_BASE_URL=<staging>`

**Verify after supply:**

```bash
node scripts/beta/validate-beta-env.mjs          # target: exit 0
node scripts/beta/validate-mobile-firebase.mjs   # target: 100%
node scripts/beta/validate-pre-beta.mjs          # target: exit 0 or 2 (manual only)
```

Full setup steps: [docs/pre-beta/EXTERNAL_SETUP.md](docs/pre-beta/EXTERNAL_SETUP.md)

---

## 3. Staging Verification Plan

Execute on **staging** after env vars are set and API is deployed. Record pass/fail in a shared QA sheet.

**Prerequisites:** `validate-beta-env.mjs` exit 0 · `setup-staging-db.mjs` run against staging `DATABASE_URL` · admin web pointed at staging API

### 3.1 Authentication

| Step | Action | Expected |
|------|--------|----------|
| 1 | `POST /api/v1/auth/register` with new email | 201; user created |
| 2 | Check inbox | Welcome email received (proves SMTP) |
| 3 | `POST /api/v1/auth/login` with same credentials | 200; access + refresh tokens |
| 4 | Call protected route with access token | 200 |
| 5 | Logout / refresh token rotation | Tokens invalidated per policy |

**Fail criteria:** Mock email in API logs only; 401 on valid token; registration blocked.

### 3.2 Password reset email

| Step | Action | Expected |
|------|--------|----------|
| 1 | `POST /api/v1/auth/forgot-password` with registered email | 200/202 |
| 2 | Check inbox | Reset email with link to `WEB_APP_URL` |
| 3 | Complete reset via link/API | New password works on login |

**Fail criteria:** No email; link points to localhost; reset token expired immediately.

### 3.3 Subscription checkout

| Step | Action | Expected |
|------|--------|----------|
| 1 | Ensure active subscription plan exists (API or admin) | Plan ID available |
| 2 | Authenticated user initiates Flutterwave checkout | Redirect to Flutterwave |
| 3 | Complete test payment | Redirect back to app/web |
| 4 | Confirm webhook received | `POST /payments/webhooks/flutterwave` 200 |
| 5 | Query user subscription | Status **ACTIVE** |

**Fail criteria:** Missing redirect URL; webhook signature fail; subscription stays pending.

### 3.4 eBook purchase

| Step | Action | Expected |
|------|--------|----------|
| 1 | Select paid eBook; start checkout | Flutterwave session created |
| 2 | Complete test payment | Webhook fires |
| 3 | Verify purchase record | User entitled to eBook |
| 4 | Open eBook in mobile reader | Stream URL loads PDF |
| 5 | `GET /api/v1/uploads/ebooks/file/{id}` without auth | **403** |

**Fail criteria:** Direct file URL accessible; stream token invalid; purchase not recorded.

### 3.5 Event RSVP

| Step | Action | Expected |
|------|--------|----------|
| 1 | List published events | At least one event visible |
| 2 | RSVP as authenticated user | 200/201; RSVP recorded |
| 3 | Re-fetch event detail | User RSVP status shown |
| 4 | Cancel or update RSVP (if supported) | State updates correctly |

**Automated reference:** `npm test -- --testPathPatterns=beta-smoke` (RSVP scenario)

### 3.6 Program enrollment

| Step | Action | Expected |
|------|--------|----------|
| 1 | List published programs | Program visible |
| 2 | Enroll authenticated user | Enrollment created |
| 3 | Re-fetch program detail | Enrollment status shown |

**Automated reference:** beta-smoke enrollment test

### 3.7 Mentorship enrollment

| Step | Action | Expected |
|------|--------|----------|
| 1 | List mentorship offerings | Offering visible |
| 2 | Enroll authenticated user | Enrollment created |
| 3 | Re-fetch mentorship detail | Enrollment confirmed |

**Automated reference:** beta-smoke mentorship scenario

### 3.8 Push notification delivery

| Step | Action | Expected |
|------|--------|----------|
| 1 | User logged in on device; notification permission granted | FCM token registered (`POST /push/device-token/register`) |
| 2 | Admin publishes announcement **or** sends targeted PUSH | API push send succeeds (no Firebase Admin error in logs) |
| 3 | Device receives notification | Foreground SnackBar (Android/iOS) minimum |
| 4 | Repeat for one admin PUSH with `entityType=EVENT` + `entityId` | Payload includes deep-link fields |

**Fail criteria:** Firebase Admin unset; token not stored; send API 500.

### 3.9 Push notification deep-link routing

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send push with `entityType=ANNOUNCEMENT`, `entityId=<id>` | Tap opens announcement detail |
| 2 | Repeat for EVENT, PROGRAM, MENTORSHIP | Each opens correct detail screen |
| 3 | Send LIBRARY route push | Opens `/library` |
| 4 | Kill app; tap notification (cold start) | `getInitialMessage` routes correctly |

**Code reference:** `PushNotificationRouter` — 7/7 unit tests pass

### 3.10 Policy acceptance

| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh user login after seed | Policy modal appears |
| 2 | Attempt to dismiss without accept | Blocked or re-prompted |
| 3 | Accept all required policies | Persisted; modal clears |
| 4 | Admin → Policies | Publish-readiness banner **green** (four types) |

**DB verify:** `node scripts/beta/verify-policy-seed.mjs`

### 3.11 Staging gate sequence (run in order)

```bash
# 1. Env audits
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs

# 2. Database
node scripts/beta/setup-staging-db.mjs
node scripts/beta/verify-policy-seed.mjs

# 3. API smoke
cd services/api && npm test -- --testPathPatterns=beta-smoke

# 4. Manual flows (sections 3.1–3.10 above)
# 5. Device smokes (section 4)
```

---

## 4. Device Testing Plan

Build staging mobile app:

```bash
node scripts/beta/build-mobile-staging.mjs https://<STAGING_API>/api/v1
cd apps/mobile-flutter
flutter clean && flutter pub get
flutter run --dart-define=API_BASE_URL=https://<STAGING_API>/api/v1
```

### 4.1 Android smoke checklist (API 33+ physical device)

| # | Test | Pass criteria | Blocker? |
|---|------|---------------|----------|
| A1 | App install & launch | No crash; Firebase init OK | P0 |
| A2 | Register or login | Dashboard loads; token stored | P0 |
| A3 | Notification permission | `POST_NOTIFICATIONS` prompt accepted | P0 |
| A4 | FCM token registration | Backend `device-token/register` 200/201 | P0 |
| A5 | Receive push (announcement publish) | Visible (foreground SnackBar minimum) | P0 |
| A6 | Tap push notification | Deep-link opens correct screen | P0 |
| A7 | Cold-start from notification | App opens to target route | P0 |
| A8 | Policy acceptance | Modal → accept → persists | P0 |
| A9 | Subscription checkout | Flutterwave → webhook → ACTIVE | P0 |
| A10 | eBook purchase + read | Checkout → stream opens reader | P0 |
| A11 | Event RSVP | RSVP succeeds from mobile | P1 |
| A12 | Program enrollment | Enrollment succeeds | P1 |
| A13 | Mentorship enrollment | Enrollment succeeds | P1 |
| A14 | Library access | Catalog loads; entitled eBooks readable | P1 |
| A15 | Direct PDF URL blocked | Unauthenticated file URL returns 403 | P0 |

**Sign-off:** All P0 checked · Tester name · Device model · Android version · Build hash

### 4.2 iOS smoke checklist (physical device only)

| # | Test | Pass criteria | Blocker? |
|---|------|---------------|----------|
| I1 | App install & launch | `GoogleService-Info.plist` + signing OK | P0 |
| I2 | Push permission | User grants notifications | P0 |
| I3 | Login | Same as Android A2 | P0 |
| I4 | FCM token registration | Backend receives iOS token | P0 |
| I5 | Receive + tap push | Navigates to deep-linked content | P0 |
| I6 | Cold-start from notification | Correct route on launch | P0 |
| I7 | Policy acceptance | Same as Android A8 | P0 |
| I8 | Subscription checkout | Parity with Android A9 | P0 |
| I9 | eBook purchase + read | Parity with Android A10 | P0 |
| I10 | RSVP / enroll / library | Parity with Android A11–A14 | P1 |

**Sign-off:** All P0 checked · Tester name · Device model · iOS version · Build hash

### 4.3 Known beta limitations (document to testers)

- Background OS notification tray when app is killed — **not implemented** (foreground + tap routing works)
- Email verification on registration — **not required** for invite-only beta
- iOS Simulator — **unreliable** for remote push; use physical device

---

## 5. Launch Decision

### 5.1 Remaining blockers

| Priority | Blocker | Type | Clears when |
|----------|---------|------|-------------|
| P0 | SMTP not configured | Config + credential | `validate-beta-env` SMTP PASS + test email received |
| P0 | Flutterwave secrets missing | Config + credential | All three env vars set + webhook registered |
| P0 | Stream secrets incomplete | Config | `CONTENT_ACCESS_SECRET` ≥32 + `API_PUBLIC_URL` set |
| P0 | Firebase Admin unset | Credential | Service account or `FCM_*` in API env |
| P0 | iOS `GoogleService-Info.plist` missing | Credential | File placed; mobile audit 100% |
| P0 | APNs not configured | Credential + manual | `.p8` in Firebase; iOS push received |
| P0 | Env validators failing | Manual | Both scripts exit 0 / 100% |
| P0 | No device push smoke | Manual | Android + iOS P0 checklist complete |
| P0 | No staging E2E | Manual | Section 3 full pass on staging |
| P1 | Admin policies banner | Manual | Green banner on staging admin |
| P1 | Flutterwave live checkout | Manual | Real test payment end-to-end |

### 5.2 Remaining credentials required

| # | Credential | Supplied to |
|---|------------|-------------|
| 1 | SMTP host, user, password, from-address | `services/api/.env` |
| 2 | Flutterwave test secret + webhook hash | `services/api/.env` + dashboard |
| 3 | `CONTENT_ACCESS_SECRET` (generated) | `services/api/.env` |
| 4 | Staging `API_PUBLIC_URL` | `services/api/.env` |
| 5 | Firebase service account JSON | `services/api/.env` |
| 6 | `GoogleService-Info.plist` | `ios/Runner/` |
| 7 | APNs `.p8` + Key ID + Team ID | Firebase Console |
| 8 | Staging `API_BASE_URL` | Mobile `--dart-define` at build |

**Already supplied:** Android `google-services.json`

### 5.3 Remaining manual tests

1. Flutterwave webhook test event on staging URL  
2. Admin publish-readiness banner on staging  
3. Staging verification plan (§3) — all ten flows  
4. Android device smoke (§4.1 P0 items)  
5. iOS device smoke (§4.2 P0 items)  
6. Full E2E: register → email → policies → purchase → eBook stream  

### 5.4 Updated readiness scores

| Dimension | June 11 | **June 15** | Delta |
|-----------|---------|-------------|-------|
| Beta readiness (code) | 86% | **88%** | +2 (Android Firebase file present) |
| Beta readiness (deployment) | 58% | **62%** | +4 (1 of 3 Firebase files + local DB PASS) |
| Production readiness | 74% | **74%** | — |
| Mobile readiness | 87% | **89%** | +2 |
| Admin readiness | 88% | **88%** | — |
| `validate-beta-env.mjs` | 2 FAIL | **2 FAIL** | — |
| `validate-mobile-firebase.mjs` | 73% (8/11) | **82% (9/11)** | +9 pts |
| `validate-pre-beta.mjs` | 3 PASS / 7 FAIL | **4 PASS / 6 FAIL** | +1 PASS |

### 5.5 Path: NO-GO → CONDITIONAL GO

Complete **all** steps in order:

```
┌─────────────────────────────────────────────────────────────┐
│  CURRENT: NO-GO                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1 — Owner supplies credentials (§2.3 checklist)      │
│  SMTP · Flutterwave · stream secrets · Firebase Admin ·      │
│  iOS plist · APNs · staging URLs                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2 — Automated gates                                  │
│  validate-beta-env.mjs        → exit 0                     │
│  validate-mobile-firebase.mjs → 100%                       │
│  validate-pre-beta.mjs        → exit 0 or 2 (zero FAIL)     │
│  setup-staging-db.mjs + verify-policy-seed.mjs on staging  │
│  npm test --testPathPatterns=beta-smoke → 9/9              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3 — Staging verification (§3)                        │
│  Auth · reset email · checkout · RSVP · enroll · push ·     │
│  deep links · policies                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4 — Device smokes (§4)                               │
│  Android P0 + iOS P0 on physical devices                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CONDITIONAL GO — invite-only beta authorized              │
│  Document known limitations (§4.3) to testers              │
└─────────────────────────────────────────────────────────────┘
```

**CONDITIONAL GO criteria (all must be true):**

1. Zero FAIL from `validate-pre-beta.mjs`  
2. `validate-beta-env.mjs` exit 0  
3. `validate-mobile-firebase.mjs` 100%  
4. Flutterwave test purchase + webhook confirmed on staging  
5. Android + iOS device push received; tap navigates correctly  
6. Manual E2E (register → email → policies → purchase → stream) passed once  

### 5.6 Path: CONDITIONAL GO → GO (full beta / pre-production)

After **≥2 weeks** of invite-only beta with no P0 incidents:

1. Resolve all P1 items from [BETA_GO_NO_GO_REPORT.md](BETA_GO_NO_GO_REPORT.md) §Exact Checklist Before Production (P0 subset for beta exit)  
2. Complete production checklist: payment diversity decision, clip premium enforcement, subscription automation, security audit remediation  
3. Separate production Firebase project and credentials  
4. Load/penetration testing on auth, webhooks, stream endpoints  
5. Monitoring and incident runbooks in place  
6. Stakeholder sign-off on beta feedback log (zero unresolved P0 bugs)

**GO criteria:** CONDITIONAL GO sustained · production checklist P0 complete · separate production sign-off document

### 5.7 Recommended beta parameters

| Parameter | Recommendation | Rationale |
|-----------|----------------|-----------|
| **Tester count** | **15–25** invite-only users | Enough coverage across Android/iOS, payments, and push without overwhelming support |
| **Beta duration** | **3–4 weeks** | Time for two payment cycles, push routing feedback, and policy edge cases |
| **Distribution** | Direct APK (Android) + TestFlight or ad-hoc iOS | No store review required for closed beta |
| **Support** | Single shared channel + known-limitations doc (§4.3) | Sets expectations on background push, email verification |

### 5.8 Final recommendation

| Scenario | Decision |
|----------|----------|
| Launch invite-only beta **today** | **NO-GO** |
| Launch after §5.5 steps complete | **CONDITIONAL GO** |
| Open public beta without email verification | **NO-GO** |
| Production launch | **NO-GO** (74%; separate checklist) |

**Next owner actions (ordered):**

1. Complete [§2.3 Owner supply checklist](#23-owner-supply-checklist-copy-paste)  
2. Re-run validators until PASS  
3. Execute [§3 Staging Verification Plan](#3-staging-verification-plan)  
4. Execute [§4 Device Testing Plan](#4-device-testing-plan)  
5. Sign **CONDITIONAL GO** when §5.5 criteria met  

Setup reference: [docs/pre-beta/EXTERNAL_SETUP.md](docs/pre-beta/EXTERNAL_SETUP.md) · DB runbook: [docs/pre-beta/PHASE_A_RUNBOOK.md](docs/pre-beta/PHASE_A_RUNBOOK.md)

---

*Generated for Beta Launch Finalization — June 15, 2026*
