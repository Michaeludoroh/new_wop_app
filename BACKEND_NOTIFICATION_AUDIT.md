# Backend Notification Infrastructure Audit

**Date:** 2026-06-17  
**Service:** `services/api` (NestJS)  
**Firebase project (mobile):** `ministry-mobile`  
**Audit type:** Static code review + validation scripts + unit test execution

---

## Executive Summary

| Area | Code readiness | Local env configured | Staging ready | Production ready |
|------|----------------|----------------------|---------------|------------------|
| Firebase Admin SDK | **PASS** | **FAIL** | **FAIL** | **FAIL** |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **PASS** (supported) | **Not set** | **Not verified** | **Not verified** |
| Push sending (`FcmProvider`) | **PASS** | Blocked by creds | Blocked by creds | Blocked by creds |
| Email sending (SMTP) | **PASS** | **FAIL** (mock fallback) | **FAIL** | **FAIL** |
| In-app + realtime | **PASS** | N/A | Depends on DB/Redis | Depends on DB/Redis |
| Notification queues (async) | **FAIL** | — | — | — |
| Push retry mechanism | **PARTIAL** | DB-backed; no scheduler | No cron wired | No cron wired |
| Unit tests | **PASS** | 10/10 push + notifications | — | — |

### Overall Go / No-Go

| Context | Verdict |
|---------|---------|
| **Code / architecture for notifications** | **GO** — real FCM provider, delivery logging, dedupe, token lifecycle |
| **Staging push/email delivery** | **NO-GO** — Firebase Admin + SMTP credentials not configured locally; staging env templates empty |
| **Production notification delivery** | **NO-GO** — credentials, scheduler for push retries, broadcast PUSH gap, and device E2E required |

---

## Architecture Overview

```mermaid
flowchart TB
  subgraph triggers [Notification Triggers]
    AdminBroadcast["POST /notifications/broadcast"]
    AdminTargeted["POST /notifications/targeted"]
    AnnouncePublish["Announcement publish"]
    MobileRegister["POST /push/device-token/register"]
  end

  subgraph services [NestJS Services]
    NS[NotificationsService]
    PS[PushService]
    ES[EmailService]
    RS[RealtimeService]
  end

  subgraph providers [Providers]
    FCM[FcmProvider - firebase-admin]
    SMTP[SmtpEmailProvider / MockSmtpProvider]
  end

  subgraph storage [Persistence]
    PG[(PostgreSQL)]
    PDT[PushDeviceToken]
    PDL[PushDeliveryLog]
    N[Notification]
  end

  AdminBroadcast --> NS
  AdminTargeted --> NS
  AnnouncePublish --> NS
  NS --> PS
  NS --> ES
  NS --> RS
  PS --> FCM
  ES --> SMTP
  PS --> PDT
  PS --> PDL
  NS --> N
  MobileRegister --> PS
```

**Key finding:** Delivery is **synchronous** in the request path. There is **no** Bull/Redis/SQS notification queue.

---

## 1. Firebase Admin SDK Initialization

### Implementation — **PASS (lazy init)**

| Item | Detail |
|------|--------|
| Package | `firebase-admin@^13.10.0` (`services/api/package.json`) |
| Provider | `FcmProvider` (`src/modules/push/push.providers/fcm.provider.ts`) |
| Init pattern | **Lazy** — Firebase app created on first `sendToTokens()` call |
| Singleton | Reuses existing app via `getApps()` / `getApp()` |
| Credential source | `cert(serviceAccount)` from env (see §2) |
| Messaging API | `getMessaging().sendEachForMulticast()` |

**Initialization flow:**

```
sendToTokens()
  → getMessagingClient()
    → initializeFirebaseApp()
      → loadServiceAccount() from ConfigService
      → initializeApp({ credential: cert(...), projectId })
```

**Evidence:** `fcm.provider.ts` lines 60–78.

### Behavior when credentials missing

- Throws `ServiceUnavailableException` on first push send attempt
- **Does not** fail API startup — app boots without Firebase
- Push token register/revoke endpoints work without Firebase (DB only)

### Defects

| ID | Severity | Issue |
|----|----------|-------|
| F1 | Medium | Lazy init — first push after deploy fails loudly if creds wrong; no startup health check |
| F2 | Low | No explicit `projectId` validation against mobile Firebase project `ministry-mobile` |

**Verdict:** **PASS** (implementation) / **FAIL** (runtime without creds)

---

## 2. `FIREBASE_SERVICE_ACCOUNT_JSON` & FCM Environment Variables

### Supported configuration — **PASS**

Two equivalent options (documented in `.env.example`, `.env.staging.example`, `.env.production.example`):

**Option A — single JSON (recommended):**

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ministry-mobile","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
```

**Option B — split variables:**

```env
FCM_PROJECT_ID=ministry-mobile
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ministry-mobile.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Parsing logic — **PASS**

| Feature | Implementation |
|---------|----------------|
| JSON parse | Supports snake_case (`project_id`, `client_email`, `private_key`) and camelCase |
| Private key newlines | `\n` escape normalization via `normalizePrivateKey()` |
| Validation | `assertServiceAccount()` — all three fields required |
| Error messages | Clear `ServiceUnavailableException` on missing/invalid JSON |

**Evidence:** `fcm.provider.ts` `loadServiceAccount()` lines 81–117.

### Local / staging / production status — **FAIL**

| Check | Result | Evidence |
|-------|--------|----------|
| `services/api/.env` | **Not set** (expected — gitignored) | `validate-pre-beta.mjs` → **FAIL** |
| `validate-mobile-firebase.mjs` | **15/16 (94%)** | Only failure: Firebase Admin creds |
| `.env.staging.example` | Placeholders empty | Lines 36–39 |
| `.env.production.example` | Placeholders empty | Lines 36–39 |

**Verdict:** **PASS** (code support) / **FAIL** (deployment configuration)

---

## 3. Notification Sending Services

### 3.1 `PushService` — **PASS**

**File:** `src/modules/push/push.service.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Token register/refresh/revoke | ✓ | `POST /push/device-token/*` |
| Send to user | ✓ | `sendToUser(userId, message)` |
| Broadcast to all tokens | ✓ | `sendBroadcast(message)` |
| Dedupe | ✓ | `dedupeKey` checked in `PushDeliveryLog` |
| Delivery logging | ✓ | Per-token success/failure in `PushDeliveryLog` |
| Invalid token cleanup | ✓ | Revokes on `messaging/registration-token-not-registered`, etc. |
| Retry processing | ✓ | `retryDueDeliveries(limit)` — **see §4** |

**FCM payload structure** (`FcmProvider`):

- `notification.title` / `notification.body` — OS display
- `data` — deep-link fields (`entityType`, `entityId`, `route`, etc.)
- Android: `priority: high`
- APNs: default sound

### 3.2 `NotificationsService` — **PARTIAL PASS**

**File:** `src/modules/notifications/notifications.service.ts`

| Channel | Targeted (`userId` set) | Broadcast (`userId` null) |
|---------|-------------------------|---------------------------|
| **IN_APP** | ✓ DB + Socket.IO | ✓ DB + Socket.IO |
| **EMAIL** | ✓ via `EmailService` | ✓ up to **200 users** (hard cap) |
| **PUSH** | ✓ via `PushService.sendToUser` | **✗ NOT SENT** |

**Critical defect (N1):** `dispatchChannelDelivery()` only calls push when `notification.userId` is truthy:

```typescript
if (channel === 'PUSH' && notification.userId) {
  await this.pushService.sendToUser(...);
}
```

Admin **broadcast notifications with channel `PUSH`** create an in-app record but **do not** invoke `sendBroadcast()`. Announcement publish is unaffected — it calls `pushService.sendBroadcast()` directly.

### 3.3 `EmailService` — **PASS (conditional on SMTP)**

**File:** `src/modules/email/email.service.ts`

| Provider | When active |
|----------|-------------|
| `SmtpEmailProvider` | `SMTP_HOST` set |
| `MockSmtpProvider` | Default when `SMTP_HOST` empty |

SMTP uses nodemailer with `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

### 3.4 Realtime (companion channel) — **PASS**

- `RealtimeService.emitNotificationCreated()` on create
- `emitAnnouncementPublished()` on announcement publish
- Requires Redis adapter when `REDIS_ADAPTER_ENABLED=true` (Socket.IO scaling — separate from notification queue)

### Test evidence

| Suite | Result |
|-------|--------|
| `push.service.spec.ts` | **8/8 pass** |
| `notifications.service.spec.ts` | **2/2 pass** |

**Verdict:** **PASS** with **N1** broadcast PUSH gap

---

## 4. Notification Queues & Retry Processing

### Async job queues — **FAIL (not implemented)**

| Technology | Used for notifications? |
|------------|---------------------------|
| Bull / `@nestjs/bull` | **No** |
| Redis queues | **No** (Redis used for Socket.IO adapter only) |
| SQS / RabbitMQ | **No** |
| In-process queue | **No** |

Push and email sends run **inline** in the HTTP request handler (or announcement publish transaction path). Failures are caught, logged to Sentry, and metrics recorded — but **not re-queued** for async retry at the notification layer.

### Push retry — **PARTIAL (DB-backed, no scheduler)**

| Component | Status |
|-----------|--------|
| `PushDeliveryLog` table | ✓ Tracks status, retryCount, nextRetryAt, retryable |
| `retryDueDeliveries()` | ✓ Re-sends failed retryable attempts (max 3, 5-min backoff) |
| Cron / `@nestjs/schedule` | **✗ Not wired** — method exists but **never called** in production code |
| HTTP endpoint for retry | **✗ None** |

**Evidence:** Grep shows `retryDueDeliveries` only in `push.service.ts` and `push.service.spec.ts`.

**Defect (Q1):** Retry infrastructure is **dead code** without an external cron job or Nest scheduler calling `retryDueDeliveries()`.

### Dedupe (not a queue, but reliability feature) — **PASS**

- Global dedupe by `dedupeKey` before send
- Retry uses suffixed key: `${dedupeKey}:retry:${retryCount + 1}`

**Verdict:** **FAIL** for queue requirement / **PARTIAL** for retry

---

## 5. Environment Variables

### Push / Firebase

| Variable | Required for push | Documented | Local status |
|----------|-------------------|------------|--------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | One of A or B | ✓ `.env.example` | **Empty** |
| `FCM_PROJECT_ID` | Option B | ✓ | **Empty** |
| `FCM_CLIENT_EMAIL` | Option B | ✓ | **Empty** |
| `FCM_PRIVATE_KEY` | Option B | ✓ | **Empty** |

### Email

| Variable | Required for real email | Documented | Local status |
|----------|-------------------------|------------|--------------|
| `SMTP_HOST` | Yes | ✓ | **Empty** → mock provider |
| `SMTP_PORT` | Recommended | ✓ | Default 587 |
| `SMTP_SECURE` | Optional | ✓ | Default false |
| `SMTP_USER` | Recommended | ✓ | **Empty** |
| `SMTP_PASS` | Recommended | ✓ | **Empty** |
| `SMTP_FROM` | Yes | ✓ | **Empty** |
| `APP_NAME` | Template branding | ✓ | — |
| `WEB_APP_URL` | Email links | ✓ | — |

### Infrastructure (notification-adjacent)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Notifications, tokens, delivery logs |
| `REDIS_URL` | Socket.IO realtime (not push queue) |
| `REDIS_ADAPTER_ENABLED` | Multi-instance realtime |

### Validation scripts

| Script | Firebase Admin check | Result (this audit) |
|--------|---------------------|---------------------|
| `scripts/beta/validate-mobile-firebase.mjs` | ✓ | **FAIL** — creds missing |
| `scripts/beta/validate-pre-beta.mjs` | ✓ `p0-firebase-admin` | **FAIL** |
| `scripts/beta/validate-pre-beta.mjs` | ✓ `p0-smtp` | **FAIL** |
| `scripts/beta/validate-beta-env.mjs` | SMTP section | Expected FAIL without SMTP |

---

## 6. Database Schema (Notification Persistence)

### `PushDeviceToken`

| Field | Purpose |
|-------|---------|
| `token` (unique) | FCM registration token |
| `platform` | ANDROID / IOS / WEB |
| `userId` | Owner |
| `revokedAt` | Soft revoke on logout / invalid token |

### `PushDeliveryLog`

| Field | Purpose |
|-------|---------|
| `dedupeKey` | Idempotency |
| `status` | SENT / FAILED / RETRYING |
| `retryCount`, `nextRetryAt`, `retryable` | Retry state |
| `payload` | JSON snapshot of title/body/data |
| Indexes | Optimized for retry queries |

### `Notification`

| Field | Purpose |
|-------|---------|
| `channel` | IN_APP / EMAIL / PUSH |
| `userId` | null = broadcast |
| `announcementId` | Link to announcement-driven notifications |

**Verdict:** **PASS** — schema supports observability and retry

---

## 7. API Endpoints (Notification & Push)

### Push device tokens (`PushController`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/push/device-token/register` | JWT |
| POST | `/push/device-token/refresh` | JWT |
| POST | `/push/device-token/revoke` | JWT |
| GET | `/push/my-devices` | JWT |

### Notifications (`NotificationsController`)

| Method | Path | Role |
|--------|------|------|
| GET | `/notifications` | USER+ |
| GET | `/notifications/:id` | USER+ |
| PATCH | `/notifications/:id/read-state` | USER+ |
| POST | `/notifications/broadcast` | ADMIN, SUPER_ADMIN |
| POST | `/notifications/targeted` | ADMIN, SUPER_ADMIN (or self) |

### Indirect push trigger

| Trigger | Push path |
|---------|-----------|
| Announcement publish | `NotificationsService.deliverPublishedAnnouncement()` → `sendBroadcast()` |
| Admin targeted PUSH | `dispatchChannelDelivery` → `sendToUser()` |
| Admin broadcast PUSH | **Broken** — see N1 |

---

## 8. Staging Readiness

| Requirement | Status | Action |
|-------------|--------|--------|
| Firebase service account on staging API | **FAIL** | Set `FIREBASE_SERVICE_ACCOUNT_JSON` for `ministry-mobile` |
| SMTP on staging | **FAIL** | Set `SMTP_*` in staging secrets |
| APNs linked in Firebase | **MANUAL** | See `IOS_PUSH_NOTIFICATION_CHECKLIST.md` |
| Mobile `google-services.json` / plist | **PASS** | Present in repo |
| Push token registration path | **PASS** | Code ready |
| Admin broadcast PUSH | **FAIL** | Code defect N1 |
| Push retry scheduler | **FAIL** | Wire cron or Nest schedule |
| Staging env template | **PASS** | `.env.staging.example` documents vars |
| Validation script | **FAIL** | 15/16 mobile-firebase; pre-beta Firebase FAIL |

**Staging Go/No-Go:** **NO-GO** for push/email until credentials deployed and N1/Q1 addressed

---

## 9. Production Readiness

| Requirement | Status | Notes |
|-------------|--------|-------|
| Separate production Firebase project or shared with staging | **DECISION NEEDED** | Docs reference single `ministry-mobile` project |
| Production service account (least privilege) | **NOT CONFIGURED** | Use Firebase IAM service account JSON |
| Secrets management | **NOT VERIFIED** | JSON in env var — ensure secret store, not plaintext in repo |
| SMTP production sender | **NOT CONFIGURED** | Verified domain required |
| Push retry cron (every 5 min) | **NOT IMPLEMENTED** | Required for Q1 |
| Monitoring | **PARTIAL** | `ObservabilityService.recordNotificationFailure()` + Sentry on channel errors |
| Rate limits / FCM quotas | **NOT IMPLEMENTED** | Relies on Firebase quotas |
| Broadcast email 200-user cap | **LIMITATION** | Large broadcasts truncated |
| Horizontal scale | **PASS** | Stateless API; Redis for Socket.IO |
| Load test push at scale | **NOT DONE** | — |

**Production Go/No-Go:** **NO-GO**

---

## 10. Defects Summary

| ID | Severity | Component | Issue |
|----|----------|-----------|-------|
| **N1** | **High** | NotificationsService | Broadcast `PUSH` channel does not call `sendBroadcast()` |
| **Q1** | **High** | PushService | `retryDueDeliveries()` has no scheduler/cron |
| **E1** | **High** | Deployment | Firebase Admin credentials not set (staging/prod/local) |
| **E2** | **High** | Deployment | SMTP not configured — email uses mock provider |
| **F1** | Medium | FcmProvider | Lazy init — no startup validation of Firebase creds |
| **N2** | Medium | NotificationsService | Email broadcast limited to 200 recipients |
| **N3** | Medium | Architecture | No async notification queue — long sends block HTTP |
| **N4** | Low | Observability | No admin UI for `PushDeliveryLog` / delivery status |
| **N5** | Low | PushController | No admin endpoint to trigger retry sweep |

---

## 11. Recommended Actions

### P0 — Before staging push/email validation

1. Set `FIREBASE_SERVICE_ACCOUNT_JSON` on staging API (Firebase Console → Service accounts → ministry-mobile).
2. Set `SMTP_HOST`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` on staging.
3. Re-run: `node scripts/beta/validate-pre-beta.mjs` → target PASS on `p0-firebase-admin` and `p0-smtp`.
4. Fix **N1:** In `dispatchChannelDelivery`, call `pushService.sendBroadcast()` when `channel === 'PUSH' && !notification.userId`.

### P1 — Reliability

5. Wire **Q1:** Add `@Cron('*/5 * * * *')` job or external cron calling `PushService.retryDueDeliveries()`.
6. Add startup health check that validates Firebase creds when `NODE_ENV=staging|production`.
7. Device smoke: admin publish announcement → verify FCM delivery (see `DEVICE_SMOKE_TEST_PLAN.md`).

### P2 — Production hardening

8. Store Firebase JSON in secret manager; inject as env at deploy time.
9. Consider Bull/Redis queue for broadcast email/push to decouple HTTP latency.
10. Remove or raise 200-user email broadcast cap with pagination.
11. Add Prometheus metrics for push success/failure rates from `PushDeliveryLog`.

---

## 12. Validation Results (This Audit)

| Check | Result |
|-------|--------|
| `npm test push.service.spec.ts notifications.service.spec.ts` | **10/10 pass** |
| `node scripts/beta/validate-mobile-firebase.mjs` | **94% (15/16)** — Firebase Admin FAIL |
| `node scripts/beta/validate-pre-beta.mjs` (Firebase + SMTP) | **FAIL** |
| Firebase Admin SDK code review | **PASS** |
| Notification queue search (Bull/Redis queue) | **None found** |
| Push retry scheduler search | **Not wired** |

---

## Appendix: Key File References

| Concern | Path |
|---------|------|
| FCM provider | `services/api/src/modules/push/push.providers/fcm.provider.ts` |
| Push orchestration | `services/api/src/modules/push/push.service.ts` |
| Multi-channel notifications | `services/api/src/modules/notifications/notifications.service.ts` |
| Email provider selection | `services/api/src/modules/email/email.module.ts` |
| Push deep links | `services/api/src/modules/push/push-deep-link.util.ts` |
| Env templates | `services/api/.env.example`, `.env.staging.example`, `.env.production.example` |
| Prisma models | `services/api/prisma/schema.prisma` (`PushDeviceToken`, `PushDeliveryLog`, `Notification`) |
| Validation | `scripts/beta/validate-mobile-firebase.mjs`, `scripts/beta/validate-pre-beta.mjs` |
| Push tests | `services/api/src/modules/push/push.service.spec.ts` |
| Notification tests | `services/api/src/modules/notifications/notifications.service.spec.ts` |
