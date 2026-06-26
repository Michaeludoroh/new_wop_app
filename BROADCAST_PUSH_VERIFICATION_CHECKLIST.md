# Broadcast Push Notification — Manual Verification Checklist

**Fix:** Admin broadcast with `channel: PUSH` now calls `PushService.sendBroadcast()`  
**Date:** 2026-06-17  
**Scope:** End-to-end validation of admin broadcast → API → FCM → mobile device  
**App:** WOP (`apps/mobile-flutter`, `com.ministrymobile.app`)  
**Admin:** `apps/admin-web` → **Notifications**  
**API endpoint:** `POST /api/v1/notifications/broadcast`

Use this checklist on **staging or production** after deploying the backend fix. Record pass/fail for each row and attach API log excerpts where noted.

---

## 0. Prerequisites (complete before testing)

| # | Item | Pass | Notes |
|---|------|------|-------|
| 0.1 | Backend deployed with broadcast push fix | ☐ | `notifications.service.ts`, `push.service.ts`, `fcm.provider.ts` |
| 0.2 | `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` set on API | ☐ | Without this, FCM calls fail with 503 |
| 0.3 | APNs key uploaded in Firebase Console (iOS) | ☐ | Required for iOS delivery |
| 0.4 | At least **2 test users** signed in on **2 physical devices** (1 iOS + 1 Android recommended) | ☐ | Simulators/emulators OK for dev only |
| 0.5 | Both devices granted notification permission and completed login | ☐ | Token registration runs post-auth |
| 0.6 | Admin account with role `ADMIN` or `SUPER_ADMIN` | ☐ | |
| 0.7 | API logs accessible (stdout, CloudWatch, Datadog, etc.) | ☐ | Needed to verify pipeline |
| 0.8 | Optional: DB access to `push_device_token` and `push_delivery_log` | ☐ | Confirms token count and delivery status |

**Pre-flight token check (optional SQL):**

```sql
SELECT COUNT(*) FROM push_device_token WHERE revoked_at IS NULL;
```

Expected: count ≥ number of test devices registered.

---

## 1. Admin actions

### 1.1 Happy path — broadcast PUSH

| Step | Action | Expected UI / API result | Pass |
|------|--------|--------------------------|------|
| 1 | Sign in to admin web as `ADMIN` or `SUPER_ADMIN` | Dashboard loads; no 403 | ☐ |
| 2 | Navigate to **Notifications** (`/notifications`) | Broadcast form visible | ☐ |
| 3 | Enter a unique **Title** (e.g. `Broadcast verify {timestamp}`) | Field accepts input | ☐ |
| 4 | Enter **Body** (e.g. `Manual verification test`) | Field accepts input | ☐ |
| 5 | Set **Channel** to **PUSH** (not IN_APP or EMAIL) | Dropdown shows `PUSH` | ☐ |
| 6 | Submit **Create broadcast** | Success message; notification appears in feed | ☐ |
| 7 | Note the returned notification `id` from network tab or feed | `userId` is `null`, `channel` is `PUSH` | ☐ |

**API request shape (for curl/Postman reference):**

```http
POST /api/v1/notifications/broadcast
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "title": "Broadcast verify 2026-06-17T14:00:00Z",
  "body": "Manual verification test",
  "channel": "PUSH"
}
```

Expected HTTP **201** with a notification object (`id`, `userId: null`, `channel: "PUSH"`).

### 1.2 Control — broadcast IN_APP (must NOT push)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| 1 | Create broadcast with channel **IN_APP** | Notification saved | ☐ |
| 2 | Check API logs | No `Broadcast push dispatch` line | ☐ |
| 3 | Check test devices | No new system push notification | ☐ |
| 4 | Open mobile app | Notification may appear in in-app feed via realtime | ☐ |

### 1.3 Control — targeted PUSH (regression)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| 1 | Create **targeted** notification with channel **PUSH** for a known `userId` | Success | ☐ |
| 2 | Check API logs | `Targeted push dispatch` (not broadcast path) | ☐ |
| 3 | Only that user's device(s) receive push | Other users do not | ☐ |

### 1.4 Negative — non-admin

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| 1 | Attempt broadcast as `USER` role (API or UI if exposed) | **403 Forbidden** | ☐ |

---

## 2. Expected backend logs (API)

Tail API logs during step **1.1**. All lines below should appear **in order** for a successful broadcast PUSH.

| Order | Logger | Expected log pattern | Pass | Actual excerpt |
|-------|--------|----------------------|------|----------------|
| 1 | `NotificationsService` | `Broadcast notification request received channel=PUSH title="..." adminId={uuid}` | ☐ | |
| 2 | `NotificationsService` | `Broadcast push dispatch notificationId={uuid}` | ☐ | |
| 3 | `PushService` | `Broadcast device tokens loaded dedupeKey=notification.created:{uuid} tokenCount={N}` | ☐ | |
| 4 | `FcmProvider` | `FCM payload generated dedupeKey=notification.created:{uuid} tokenCount={N} title="..." dataKeys=...` | ☐ | |
| 5 | `FcmProvider` | `FCM response received dedupeKey=notification.created:{uuid} success={N} failure={M}` | ☐ | |
| 6 | `PushService` | `FCM dispatch processed dedupeKey=notification.created:{uuid} provider=FCM attempts={N} success={N} failed={M}` | ☐ | |
| 7 | `NotificationsService` | `Broadcast push completed notificationId={uuid} attempts={N} success={N} failed={M}` | ☐ | |

**Substitute `{uuid}`** with the notification id from step 1.1.7.

**Payload data keys** (in log line 4) should include at minimum:

- `notificationId`
- `channel` (= `PUSH`)
- `createdAt`
- `category` and `dedupeKey` are added by FCM provider at send time

**Dedupe key format:** `notification.created:{notificationId}`

### 2.1 Database verification (optional)

| Check | Query / table | Expected | Pass |
|-------|---------------|----------|------|
| Delivery rows created | `push_delivery_log` WHERE `dedupe_key = 'notification.created:{id}'` | One row per active device token | ☐ |
| Status | `status = 'SENT'`, `success = true` | For valid tokens | ☐ |
| Provider | `provider = 'FCM'` | | ☐ |

---

## 3. Expected FCM logs

The API uses Firebase Admin SDK (`sendEachForMulticast`). FCM activity appears in **two places**.

### 3.1 Application logs (primary — always check these)

These are emitted by `FcmProvider` in the API process:

| Event | Log line | Pass |
|-------|----------|------|
| Before send | `FCM payload generated dedupeKey=... tokenCount=N title="..." dataKeys=notificationId,channel,createdAt,...` | ☐ |
| After send | `FCM response received dedupeKey=... success=N failure=0` | ☐ |

For a healthy run with registered devices: **`success` should equal `tokenCount`** and **`failure` should be `0`**.

### 3.2 Firebase / Google Cloud (optional — production debugging)

| Location | What to look for | Pass |
|----------|------------------|------|
| [Firebase Console](https://console.firebase.google.com/) → Cloud Messaging | Recent sends (if usage dashboard enabled) | ☐ |
| Google Cloud Logging → `firebase.googleapis.com` | `SendMessage` / multicast entries for project `ministry-mobile` | ☐ |
| FCM HTTP v1 response (if capturing debug) | `successCount` matches device count | ☐ |

**Note:** The backend does not write to a separate “FCM log table”; `push_delivery_log` is the persistence layer for per-token results.

### 3.3 FCM message shape (reference)

Each device should receive a notification with:

| Field | Expected value |
|-------|----------------|
| Notification title | Admin-entered title |
| Notification body | Admin-entered body |
| Data `notificationId` | UUID from API response |
| Data `channel` | `PUSH` |
| Data `category` | `NOTIFICATION` |
| Data `dedupeKey` | `notification.created:{notificationId}` |
| Android priority | `high` |
| iOS sound | `default` |

---

## 4. Expected device behavior

Test on **foreground**, **background**, and **terminated (cold start)** states.

### 4.1 Foreground (app open)

| Step | Expected behavior | Pass |
|------|-------------------|------|
| Device receives push while app is visible | In-app handling via `FirebaseMessaging.onMessage` | ☐ |
| Title and body match admin input | Visible in app UI / system banner (OS-dependent) | ☐ |
| Tap notification (if shown) | Navigates to `/notifications` (via `notificationId` in data) | ☐ |

### 4.2 Background (app minimized)

| Step | Expected behavior | Pass |
|------|-------------------|------|
| System tray notification appears | Title + body visible | ☐ |
| Tap notification | App opens; `onMessageOpenedApp` fires | ☐ |
| Deep link | Routes to **Notifications** screen | ☐ |

### 4.3 Terminated (app force-closed)

| Step | Expected behavior | Pass |
|------|-------------------|------|
| System notification delivered | Appears in notification center | ☐ |
| Tap notification | App cold-starts | ☐ |
| Cold-start route | Buffered `getInitialMessage` flushed after dashboard mounts → `/notifications` | ☐ |

### 4.4 Multi-device broadcast

| Step | Expected behavior | Pass |
|------|-------------------|------|
| User A device receives push | Yes | ☐ |
| User B device receives push | Yes | ☐ |
| Admin device (if logged in as user with token) | Receives push if token registered | ☐ |

### 4.5 In-app feed (secondary)

| Step | Expected behavior | Pass |
|------|-------------------|------|
| Open mobile **Notifications** | Broadcast may appear in list (realtime `notification.created`) | ☐ |
| Note | PUSH broadcast creates DB row with `channel: PUSH`; in-app list shows it regardless of push delivery | |

---

## 5. Failure scenarios

Document expected behavior when things go wrong. These confirm the fix does not regress error handling.

### 5.1 No registered device tokens

| Setup | Send broadcast PUSH | Expected logs | Expected devices | Pass |
|-------|---------------------|---------------|------------------|------|
| Revoke all tokens or use fresh env with zero tokens | Admin creates PUSH broadcast | Lines 1–2 appear; line 3 shows `tokenCount=0`; **no** `FCM payload generated` | No push | ☐ |

### 5.2 Missing Firebase credentials

| Setup | Action | Expected | Pass |
|-------|--------|----------|------|
| Unset `FIREBASE_SERVICE_ACCOUNT_JSON` / `FCM_*` on API | Create PUSH broadcast | API returns **503** or notification saves but channel delivery fails; Sentry/observability may record `notification_channel_delivery_failed_broadcast` | ☐ |

### 5.3 Duplicate broadcast (dedupe)

| Setup | Action | Expected | Pass |
|-------|--------|----------|------|
| Re-send identical broadcast (creates **new** notification id) | Second broadcast with new title | New `notification.created:{newId}` dedupe key; FCM sends again | ☐ |
| Retry same logical send with **same** dedupe key (internal) | N/A for admin UI — dedupe is per notification id | Each admin broadcast gets unique id, so dedupe only blocks programmatic retries | ☐ |

### 5.4 Invalid or expired FCM token

| Setup | Action | Expected logs | Expected DB | Pass |
|-------|--------|---------------|-------------|------|
| Insert invalid token in `push_device_token` | Broadcast PUSH | `FCM response received ... failure=1` (or partial failure) | `push_delivery_log` row with `success=false`; token may be revoked if error is `registration-token-not-registered` | ☐ |

### 5.5 Wrong channel selected

| Setup | Action | Expected | Pass |
|-------|--------|----------|------|
| Admin selects **IN_APP** instead of **PUSH** | Submit broadcast | No push logs; no device notification | ☐ |

### 5.6 iOS-specific failures

| Condition | Symptom | Check | Pass |
|-----------|---------|-------|------|
| `aps-environment: development` on prod build | iOS prod device never receives | Entitlements + provisioning profile | ☐ |
| APNs key not in Firebase | FCM success=0, failure=N on iOS tokens | Firebase Console → Cloud Messaging → Apple app config | ☐ |

### 5.7 Android-specific failures

| Condition | Symptom | Check | Pass |
|-----------|---------|-------|------|
| Google Play Services missing (emulator) | No delivery | Use image with Play Store | ☐ |
| Notification permission denied (Android 13+) | No tray notification | App settings → Notifications enabled | ☐ |

### 5.8 Authorization failure

| Actor | Action | Expected | Pass |
|-------|--------|----------|------|
| `USER` role | `POST /notifications/broadcast` | **403 Forbidden** | ☐ |
| Unauthenticated | Same endpoint | **401 Unauthorized** | ☐ |

---

## 6. Sign-off summary

| Scenario | Tester | Date | Result | Notes |
|----------|--------|------|--------|-------|
| Happy path — broadcast PUSH (multi-device) | | | ☐ PASS / ☐ FAIL | |
| Control — IN_APP no push | | | ☐ PASS / ☐ FAIL | |
| Regression — targeted PUSH | | | ☐ PASS / ☐ FAIL | |
| Failure — zero tokens | | | ☐ PASS / ☐ FAIL | |
| Failure — wrong channel | | | ☐ PASS / ☐ FAIL | |
| iOS foreground / background / cold start | | | ☐ PASS / ☐ FAIL | |
| Android foreground / background / cold start | | | ☐ PASS / ☐ FAIL | |

**Overall broadcast push verification:** ☐ **PASS** / ☐ **FAIL**

**Blockers (if FAIL):**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 7. Quick reference — log grep commands

```bash
# All broadcast push stages
grep -E "Broadcast notification request|Broadcast push dispatch|Broadcast device tokens loaded|FCM payload generated|FCM response received|FCM dispatch processed|Broadcast push completed" api.log

# Single notification trace (replace UUID)
grep "notification-broadcast-uuid-here" api.log
```

---

## Related docs

- `IOS_PUSH_NOTIFICATION_CHECKLIST.md` — iOS/APNs setup
- `DEVICE_SMOKE_TEST_PLAN.md` — broader mobile push smoke tests
- `BACKEND_NOTIFICATION_AUDIT.md` — original root-cause analysis (N1)
