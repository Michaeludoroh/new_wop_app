# Device Smoke Test Plan — WOP Push Notifications

**App:** WOP (`apps/mobile-flutter`)  
**Version:** 0.1.0 (build 1)  
**Package / Bundle:** `com.ministrymobile.app`  
**Firebase project:** `ministry-mobile`  
**Date:** 2026-06-17  

This plan validates **end-to-end push notification delivery and deep-link navigation** on physical Android and iOS devices against a **staging API** with Firebase Admin credentials configured.

---

## Prerequisites (All Testers)

Complete before starting device tests. See `IOS_PUSH_NOTIFICATION_CHECKLIST.md` for iOS-specific setup.

| # | Prerequisite | Owner | Done |
|---|--------------|-------|------|
| P1 | Staging API reachable with valid test user credentials | Backend | ☐ |
| P2 | API has `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*` set | Backend | ☐ |
| P3 | Mobile build compiled with `--dart-define=API_BASE_URL=https://<staging>/api/v1` | Mobile | ☐ |
| P4 | Android: `google-services.json` present for `com.ministrymobile.app` | Mobile | ☐ |
| P5 | iOS: `GoogleService-Info.plist` present; APNs key uploaded to Firebase | Mobile / Infra | ☐ |
| P6 | iOS release/TestFlight: `aps-environment: production` in signed build | Mobile | ☐ |
| P7 | Tester has network (Wi‑Fi or cellular) | Tester | ☐ |
| P8 | Tester records: device model, OS version, build number, tester name | Tester | ☐ |

**Infrastructure validation (optional pre-check):**

```bash
node scripts/beta/validate-mobile-firebase.mjs
```

Target: **16/16 PASS**.

---

## Test Accounts & Payloads

### Test user

Use a staging account provisioned by the team (not production PII). Record email used on the sign-off sheet.

### Sample FCM data payloads (for Console or API-triggered push)

The app routes using **`data`** fields (see `PushNotificationRouter`). Include both `notification` (for OS banner) and `data` (for routing).

**Event deep link:**

```json
{
  "notification": { "title": "Smoke Test — Event", "body": "Tap to open event details" },
  "data": {
    "entityType": "EVENT",
    "entityId": "<valid-event-uuid-from-staging>",
    "route": "/events/details"
  }
}
```

**Announcement deep link:**

```json
{
  "notification": { "title": "Smoke Test — Announcement", "body": "Tap to open announcement" },
  "data": {
    "entityType": "ANNOUNCEMENT",
    "entityId": "<valid-announcement-uuid>",
    "route": "/announcements/details"
  }
}
```

**Library (no entity ID):**

```json
{
  "notification": { "title": "Smoke Test — Library", "body": "Tap to open library" },
  "data": {
    "entityType": "LIBRARY",
    "route": "/library"
  }
}
```

**Notifications inbox fallback:**

```json
{
  "notification": { "title": "Smoke Test — Inbox", "body": "Tap to open notifications" },
  "data": {
    "notificationId": "<uuid-or-test-id>"
  }
}
```

### How to send test pushes

1. **Preferred:** Trigger from staging admin (publish announcement / targeted notification) so backend `buildPushData()` matches production.
2. **Alternative:** Firebase Console → Messaging → send to **FCM registration token** copied from API logs or backend DB (`push_device_token` table).
3. **Alternative:** `curl` staging API push endpoint (if exposed for admins) with valid Bearer token.

---

## Android Smoke Tests

**Device requirements:** Physical device or emulator with Google Play services; **Android 13+** recommended to exercise `POST_NOTIFICATIONS` permission.

**Build install:**

```bash
cd apps/mobile-flutter
flutter install --dart-define=API_BASE_URL=https://<staging-api>/api/v1
# Or install release APK/AAB from CI artifact
```

### A1 — Install app

| Step | Action | Expected |
|------|--------|----------|
| 1 | Install staging build on device | App icon **WOP** appears |
| 2 | Launch app | Splash screen shows **WOP** and organization subtitle |
| 3 | No immediate crash | App reaches auth landing or login |

**Pass criteria:** App launches to splash → auth landing without crash.

---

### A2 — Login

| Step | Action | Expected |
|------|--------|----------|
| 1 | Tap **Login** (or equivalent) | Login form visible |
| 2 | Enter staging email + password | Fields accept input |
| 3 | Submit | Loading indicator; then dashboard |
| 4 | Observe bottom nav | Tabs: Dashboard, Events, Clips, Library, More |

**Pass criteria:** Authenticated user reaches **Dashboard** with tab bar.

---

### A3 — FCM token registration

| Step | Action | Expected |
|------|--------|----------|
| 1 | On first login, accept **notification permission** when prompted (Android 13+) | System dialog → Allow |
| 2 | Wait 5–10 seconds after dashboard loads | No error snackbar |
| 3 | Verify backend (DB or API logs) | `POST /push/device-token/register` → **200/201** |
| 4 | Confirm record | Platform `ANDROID`, token non-empty, linked to user |

**Pass criteria:** Backend shows active FCM token for test user on **ANDROID**.

**If permission denied:** Settings → Apps → WOP → Notifications → Allow; logout/login and re-check.

---

### A4 — Receive push (foreground)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Keep app **open** on Dashboard | App in foreground |
| 2 | Send smoke test push (Event payload) | **SnackBar** appears with title |
| 3 | SnackBar shows **Open** action | Action visible when routable payload |

**Pass criteria:** Foreground message surfaces in-app SnackBar within **60 seconds**.

---

### A5 — Receive push (background)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Home (app backgrounded) | App not visible |
| 2 | Send smoke test push (Announcement payload) | OS notification in shade/tray |
| 3 | Do **not** tap yet | Notification visible |

**Pass criteria:** System notification appears within **60 seconds** while app is backgrounded.

---

### A6 — Deep-link navigation (notification tap)

Run **three** tap scenarios:

| Scenario | App state | Action | Expected destination |
|----------|-----------|--------|----------------------|
| D1 Background tap | Backgrounded | Tap notification tray item | **Announcement details** (or matching entity screen) |
| D2 Cold start tap | Force-quit app | Send push → tap notification | App opens → navigates to target screen |
| D3 Foreground Open | Foreground SnackBar | Tap **Open** on SnackBar | **Event details** (or matching entity screen) |

**Pass criteria:** Each scenario navigates to the correct screen (not blank route, not stuck on splash).

**Known risk:** Cold-start tap (D2) may occasionally miss routing if notification fires before Dashboard subscribes — record **FAIL** with steps if observed.

---

### A7 — Logout token revoke (optional P1)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Logout from app | Returns to auth landing |
| 2 | Check backend | `POST /push/device-token/revoke` or token marked inactive |
| 3 | Send push to old token | Should not deliver to device (or FCM invalid) |

---

## iOS Smoke Tests

**Device requirements:** **Physical iPhone required** — iOS Simulator does not reliably deliver remote APNs/FCM.

**Build install:**

- **Debug:** `flutter run --dart-define=API_BASE_URL=...` on connected device  
- **TestFlight:** Install build with `aps-environment: production` and APNs key in Firebase

### I1 — Install app

| Step | Action | Expected |
|------|--------|----------|
| 1 | Install staging or TestFlight build | **WOP** icon on home screen |
| 2 | Launch app | Splash → auth landing |
| 3 | Trust developer / TestFlight if prompted | App opens |

**Pass criteria:** App launches without crash.

---

### I2 — Login

Same steps as **A2**. User reaches Dashboard with tab bar.

---

### I3 — APNs registration

| Step | Action | Expected |
|------|--------|----------|
| 1 | On login, iOS shows **Allow Notifications** alert | System permission dialog |
| 2 | Tap **Allow** | Dialog dismisses |
| 3 | Settings → WOP → Notifications | Allow Notifications **ON** |
| 4 | (Optional) Xcode device console | No APNs registration errors |

**Pass criteria:** Notification permission granted.

**If denied:** Settings → WOP → Notifications → enable; kill app, relaunch, login again.

---

### I4 — FCM token registration

| Step | Action | Expected |
|------|--------|----------|
| 1 | After permission + dashboard load, wait 10s | No crash |
| 2 | Verify backend | `POST /push/device-token/register` → **200/201** |
| 3 | Confirm platform | `IOS`, token non-empty |

**Pass criteria:** Backend stores iOS FCM token for test user.

**If fail:** Verify APNs key in Firebase (Key ID, Team ID), bundle ID match, and `aps-environment` matches build type (dev vs production).

---

### I5 — Receive push (foreground)

Same as **A4**. SnackBar with optional **Open** action.

---

### I6 — Receive push (background)

Same as **A5**. Notification appears in iOS Notification Center / lock screen.

---

### I7 — Deep-link navigation (notification tap)

Same three scenarios as **A6** (background tap, cold start, foreground Open).

**Pass criteria:** Correct screen opens for each entity type tested.

---

### I8 — TestFlight-specific (if applicable)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Confirm build is TestFlight production | `aps-environment: production` in IPA |
| 2 | Repeat I4–I7 | Same pass criteria |
| 3 | Push from production FCM path | Delivery within 60s |

---

## Execution Log Template

Copy for each test session:

```
Session ID: ___________
Date: ___________
Tester: ___________
Device: ___________  OS: ___________
Build: WOP 0.1.0 (___)  API: ___________
Build type: [ ] Debug  [ ] TestFlight  [ ] Release APK

Android tests (A1–A6):  PASS ___ / FAIL ___
iOS tests (I1–I7):      PASS ___ / FAIL ___

Notes:
```

---

## Beta Tester Pass / Fail Checklist

Print or share this section with beta testers. Mark **PASS** or **FAIL** for each item. **P0** items block push beta sign-off.

### Tester information

| Field | Value |
|-------|-------|
| Tester name | |
| Date | |
| Platform | ☐ Android  ☐ iOS |
| Device model | |
| OS version | |
| App version / build | |
| API environment (staging URL) | |

---

### P0 — Required for push beta sign-off

| ID | Test | Android PASS/FAIL | iOS PASS/FAIL | Notes |
|----|------|-------------------|---------------|-------|
| P0-1 | App installs and launches to splash/auth | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-2 | Login succeeds → Dashboard visible | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-3 | Notification permission granted | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-4 | FCM token registered on backend (`ANDROID` / `IOS`) | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-5 | Push received — app in **foreground** (SnackBar) | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-6 | Push received — app in **background** (OS tray) | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-7 | Tap notification → correct **deep-link screen** | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P0-8 | Cold start: tap notification → opens correct screen | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |

---

### P1 — Strongly recommended

| ID | Test | Android PASS/FAIL | iOS PASS/FAIL | Notes |
|----|------|-------------------|---------------|-------|
| P1-1 | Foreground SnackBar **Open** navigates correctly | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P1-2 | EVENT entityType routes to event details | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P1-3 | ANNOUNCEMENT entityType routes to announcement details | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P1-4 | LIBRARY entityType routes to library | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P1-5 | Logout revokes token / no push after logout | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P1-6 | Session restore after kill app → still logged in | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |

---

### P2 — Optional regression spot-checks

| ID | Test | Android PASS/FAIL | iOS PASS/FAIL | Notes |
|----|------|-------------------|---------------|-------|
| P2-1 | Events tab loads | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P2-2 | Clips tab loads | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P2-3 | Library tab loads | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P2-4 | More → About WOP loads | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |
| P2-5 | Subscriptions screen opens from More | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | |

---

### Sign-off summary

| Platform | All P0 PASS? | Tester initial | Date |
|----------|--------------|----------------|------|
| Android | ☐ YES ☐ NO | | |
| iOS | ☐ YES ☐ NO | | |

**Push beta recommendation:**

| Result | Action |
|--------|--------|
| **Both platforms — all P0 PASS** | **GO** for expanded push beta |
| **Any P0 FAIL on either platform** | **NO-GO** — file issue with session ID, device, and failed step ID |
| **iOS P0-4/P0-6 fail, Android pass** | Check APNs key, `aps-environment`, TestFlight profile |
| **Both fail P0-4** | Check API Firebase Admin creds and staging URL dart-define |

---

### Issue report template (for FAIL items)

```
Failed test ID: P0-__
Platform: Android / iOS
Device + OS:
Build:
Steps to reproduce:
Expected:
Actual:
Screenshot or screen recording: (link)
Backend log snippet (token register / FCM send): (if available)
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `IOS_PUSH_NOTIFICATION_CHECKLIST.md` | Apple / Firebase / APNs setup |
| `FIREBASE_RUNTIME_AUDIT_REPORT.md` | Full Firebase + runtime audit |
| `docs/pre-beta/EXTERNAL_SETUP.md` | Credentials and staging setup |
| `scripts/beta/validate-mobile-firebase.mjs` | Automated infra validation |
