# Push Notification Validation Report

**Date:** June 13, 2026  
**Scope:** End-to-end push notification delivery validation (read-only; no new features)  
**Prior mobile readiness:** 84% ([BETA_LAUNCH_READINESS_REPORT.md](BETA_LAUNCH_READINESS_REPORT.md))

---

## Executive Summary

Push notification **application logic and backend APIs are implemented and unit-tested**, but **end-to-end device delivery cannot be validated** in the current workspace. Native Firebase configuration files are **absent** on both Android and iOS, backend Firebase Admin credentials are **not set** in `services/api/.env`, and no physical device or emulator FCM smoke test was executed.

**Verdict:** Push is **not production-ready for device delivery**. Code-path validation passes; hardware E2E fails due to missing Firebase platform configuration.

---

## Validation Matrix

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Firebase Android configuration | **FAIL** | No `google-services.json`; no Google Services Gradle plugin |
| 2 | Firebase iOS configuration | **FAIL** | No `GoogleService-Info.plist`; no APNs/Firebase setup in `AppDelegate` |
| 3 | FCM token registration | **PARTIAL** | Mobile + API code verified; device token acquisition blocked without Firebase init |
| 4 | Foreground notification delivery | **PARTIAL** | SnackBar handler wired; requires Firebase init on device |
| 5 | Background notification delivery | **FAIL** | Background handler only calls `Firebase.initializeApp()`; no OS tray |
| 6 | Notification tap navigation | **PARTIAL** | Router + dashboard listeners wired; not device-tested |
| 7 | Deep linking (Announcements, Events, Programs, Mentorship, Library) | **PARTIAL** | Router supports routes; backend payloads lack `entityType`/`route` for modules |

---

## 1. Firebase Android Configuration

### Expected

- `apps/mobile-flutter/android/app/google-services.json`
- Google Services plugin in Gradle (`com.google.gms.google-services`)
- FCM meta-data in `AndroidManifest.xml` (optional with FlutterFire auto-config)
- `POST_NOTIFICATIONS` permission for Android 13+

### Found

| Item | Status | Location |
|------|--------|----------|
| `google-services.json` | **Missing** | Not present anywhere in repo |
| Google Services Gradle plugin | **Missing** | `android/settings.gradle.kts` — no `com.google.gms.google-services` |
| Plugin applied in app module | **Missing** | `android/app/build.gradle.kts` |
| FCM service meta-data | **Missing** | `AndroidManifest.xml` — only Flutter embedding meta-data |
| `POST_NOTIFICATIONS` permission | **Missing** | Only `INTERNET` in debug/profile manifests |
| Application ID | Placeholder | `com.example.ministry_mobile` |

### Result: **FAIL** — Android cannot obtain FCM tokens or receive pushes without `google-services.json` and Gradle plugin.

---

## 2. Firebase iOS Configuration

### Expected

- `ios/Runner/GoogleService-Info.plist`
- APNs key/certificate configured in Firebase Console
- Push capability in Xcode project
- Firebase initialization in `AppDelegate` (often handled by FlutterFire plugins when plist present)

### Found

| Item | Status | Location |
|------|--------|----------|
| `GoogleService-Info.plist` | **Missing** | Not in repo; not in `.gitignore` exceptions |
| Firebase import in AppDelegate | **Missing** | `AppDelegate.swift` — default Flutter template only |
| Push Notifications capability | **Not verified** | `Info.plist` — no `UIBackgroundModes` remote-notification entry |
| APNs configuration | **Not configured** | No Firebase project linkage |

### Result: **FAIL** — iOS cannot register for remote notifications without plist and APNs setup.

---

## 3. FCM Token Registration

### Mobile client (`FirebaseMessagingService`)

| Step | Implementation | Device E2E |
|------|----------------|------------|
| `Firebase.initializeApp()` | Called in `initialize()`; catches error if config absent | **Not verified** |
| Permission request | `_messaging.requestPermission()` | **Not verified** |
| Token fetch | `_messaging.getToken()` | **Blocked without native config** |
| API register | `POST /push/device-token/register` with Bearer token | **Code verified** |
| Token refresh | `onTokenRefresh` → `/push/device-token/refresh` | **Code verified** |
| Logout revoke | `revokeCurrentToken()` → `/push/device-token/revoke` | **Code verified** |
| Auth hook | `AuthProvider._registerPushToken()` after login/bootstrap | **Code verified** |

### Backend API (`PushService`)

| Test | Result |
|------|--------|
| `push.service.spec.ts` — register token | **Pass** |
| `push.service.spec.ts` — refresh token | **Pass** |
| `push.service.spec.ts` — revoke token | **Pass** |
| `push.service.spec.ts` — block cross-user token hijack | **Pass** |

### Backend credentials

| Variable | `services/api/.env` | Status |
|----------|---------------------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Not set | **Missing** |
| `FCM_PROJECT_ID` | Not set | **Missing** |
| `FCM_CLIENT_EMAIL` | Not set | **Missing** |
| `FCM_PRIVATE_KEY` | Not set | **Missing** |

`FcmProvider` throws `ServiceUnavailableException` when credentials are absent — **server cannot send FCM messages** in current env.

### Result: **PARTIAL** — API and client code paths verified by tests; end-to-end token registration on device **not demonstrated**.

---

## 4. Foreground Notification Delivery

### Implementation

```98:115:apps/mobile-flutter/lib/screens/dashboard_screen.dart
  void _bindPushNotifications() {
    final messaging = AuthScope.read(context).firebaseMessagingService;
    _foregroundPushSub ??= messaging.foregroundMessages.listen((message) {
      // ... SnackBar with optional "Open" action
    });
```

- `FirebaseMessaging.onMessage` → `foregroundMessages` stream → SnackBar on dashboard
- Requires user authenticated and on `DashboardScreen`
- Requires successful `Firebase.initializeApp()` (fails silently today without native config)

### Result: **PARTIAL** — Handler wired; **no device evidence** of foreground SnackBar appearing from real FCM message.

---

## 5. Background Notification Delivery

### Implementation

```13:18:apps/mobile-flutter/lib/core/notifications/services/firebase_messaging_service.dart
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Native Firebase config is absent in some local/test builds.
  }
}
```

| Capability | Status |
|------------|--------|
| Background handler registered | Yes |
| Processes notification payload | **No** |
| Shows system tray notification | **No** (`flutter_local_notifications` not used) |
| Data-only message handling | **No** |

When app is backgrounded/killed, users will **not** see OS-level notification banners unless the FCM message includes a `notification` payload AND the OS displays it via Firebase SDK — which still requires native config.

### Result: **FAIL** — Background delivery not validated; handler is a stub beyond Firebase init.

---

## 6. Notification Tap Navigation

### Implementation

| Trigger | Handler | Target |
|---------|---------|--------|
| Foreground tap (SnackBar "Open") | `_navigateToPushRoute()` | Resolved route |
| Background/resumed tap | `onMessageOpenedApp` → `_openedPushSub` | Resolved route |
| Cold start | `getInitialMessage()` → `_openedMessages` | Resolved route |

### Router resolution (`PushNotificationRouter`)

| Payload pattern | Resolved route | Unit test |
|-----------------|----------------|-----------|
| `notificationId` present | `/notifications` | **Pass** |
| `category: NOTIFICATION` | `/notifications` | **Pass** |
| `route: '/…'` explicit | Custom route | **Pass** |
| `entityType: ANNOUNCEMENT` + `entityId` | `/announcements/details` | **Not tested** |
| `entityType: EVENT` + `entityId` | `/events/details` | **Not tested** |
| `entityType: PROGRAM` + `entityId` | `/programs/details` | **Not tested** |
| `entityType: MENTORSHIP` + `entityId` | `/mentorship/details` | **Not tested** |
| `entityType: EBOOK` + `entityId` | `/ebooks/details` | **Pass** (EBOOK only) |
| `route: '/library'` explicit | `/library` | **Not tested** |

### Backend payload reality

`NotificationsService.dispatchChannelDelivery` sends PUSH data as:

```json
{
  "notificationId": "<uuid>",
  "channel": "PUSH",
  "createdAt": "<iso>"
}
```

**No `entityType`, `entityId`, or `route` fields** are included. Taps from production notifications will route to **`/notifications` only**, not module detail screens.

### Result: **PARTIAL** — Tap navigation code works for supported payload shapes; **actual backend payloads do not deep-link to modules**.

---

## 7. Deep Linking Validation

| Module | Route(s) | Router support | Backend sends deep-link data | Device E2E |
|--------|----------|----------------|---------------------------|------------|
| **Announcements** | `/announcements/details` | `entityType: ANNOUNCEMENT` | **No** | **Not tested** |
| **Events** | `/events/details` | `entityType: EVENT` | **No** | **Not tested** |
| **Programs** | `/programs/details` | `entityType: PROGRAM` | **No** | **Not tested** |
| **Mentorship** | `/mentorship/details` | `entityType: MENTORSHIP` | **No** | **Not tested** |
| **Library** | `/library` | Explicit `route` only (no `LIBRARY` entityType) | **No** | **Not tested** |

All five module deep links are **code-capable but not end-to-end functional** with current backend notification payloads.

---

## Working Flows

| Flow | Layer | Evidence |
|------|-------|----------|
| Push token register API | Backend | `push.service.spec.ts` — 8/8 pass |
| Push token refresh API | Backend | Unit test pass |
| Push token revoke on logout | Mobile + Backend | Code review + unit test |
| FCM send + delivery logging | Backend | `PushService delivery reliability` tests pass |
| Invalid token invalidation | Backend | Unit test pass |
| Push route resolution (notificationId) | Mobile | `push_notification_router_test.dart` — 4/4 pass |
| Foreground SnackBar handler | Mobile | Code in `dashboard_screen.dart` |
| Tap/opened-app navigation handler | Mobile | Code in `dashboard_screen.dart` |
| In-app notifications (REST + Socket.IO) | Mobile | Separate from FCM; functional via `NotificationsProvider` |

---

## Failed Flows

| Flow | Reason |
|------|--------|
| Android FCM token acquisition | No `google-services.json` or Gradle plugin |
| iOS FCM token acquisition | No `GoogleService-Info.plist` or APNs setup |
| Server-side FCM message send | Firebase Admin credentials not in `.env` |
| Device foreground push display | Cannot run without native Firebase config |
| Device background OS notification | No native config + stub background handler |
| Device tap-to-navigate | No device test executed |
| Module deep links from live notifications | Backend payload lacks `entityType`/`route` |
| Library deep link via entity type | No `LIBRARY` case in router |

---

## Missing Firebase Configuration

### Mobile (required for device delivery)

| File / Setting | Platform | Status |
|----------------|----------|--------|
| `android/app/google-services.json` | Android | **Missing** |
| `com.google.gms.google-services` plugin | Android Gradle | **Missing** |
| `ios/Runner/GoogleService-Info.plist` | iOS | **Missing** |
| APNs key in Firebase Console | iOS | **Not configured** |
| Push Notifications capability | Xcode | **Not verified** |
| `POST_NOTIFICATIONS` permission | Android 13+ | **Missing** |
| Firebase project app registrations | Both | **Not linked** |

### Backend (required for server send)

| Variable | Status |
|----------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` | **Not set in `.env`** |

### Mobile env placeholders (`.env.example` only)

```
FIREBASE_PROJECT_ID=
FIREBASE_ANDROID_APP_ID=
FIREBASE_IOS_APP_ID=
FIREBASE_MESSAGING_SENDER_ID=
```

All empty — integration-ready placeholders only.

---

## Device Testing Evidence

| Test type | Executed | Result |
|-----------|----------|--------|
| Physical Android device FCM | **No** | Native config absent |
| Physical iOS device FCM | **No** | Native config absent |
| Android emulator FCM | **No** | Not run |
| iOS simulator push | **No** | Not run |
| Firebase Console test message | **No** | No project credentials |
| `push.service.spec.ts` | **Yes** | **8/8 pass** |
| `push_notification_router_test.dart` | **Yes** | **4/4 pass** |

**Conclusion:** All evidence is **automated unit/widget test** coverage. **Zero device-level push delivery evidence** exists in this validation pass.

---

## Remaining Push-Notification Blockers

| Priority | Blocker | Blocks |
|----------|---------|--------|
| **P0** | Add `google-services.json` + Gradle plugin (Android) | Android token + delivery |
| **P0** | Add `GoogleService-Info.plist` + APNs in Firebase (iOS) | iOS token + delivery |
| **P0** | Configure Firebase Admin credentials in API env | Server-side FCM send |
| **P0** | Device smoke test: login → token in DB → send test push | E2E verification |
| **P1** | Add `POST_NOTIFICATIONS` to Android manifest | Android 13+ permission |
| **P1** | Include `entityType`/`entityId` or `route` in backend PUSH payloads | Module deep links |
| **P1** | Add `LIBRARY` entity type or standardize `route: /library` in payloads | Library deep link |
| **P2** | Background tray notifications (`flutter_local_notifications` or notification payload) | Background UX |
| **P2** | Firebase init before auth for cold-start tap handling | Edge case reliability |

---

## Updated Mobile Readiness Score

| Dimension | Post Phase 1 | Post Push Validation | Change |
|-----------|--------------|----------------------|--------|
| **Mobile readiness** | 84% | **80%** | −4 |

### Rationale

- **−4** for absent native Firebase config on both platforms, no device E2E evidence, and backend payloads that do not enable module deep links
- **Retained credit** for implemented client handlers, router, token lifecycle API, and passing unit tests (12 automated tests)

Push remains a **beta blocker** until P0 items above are resolved and one device on each platform confirms token registration + message receipt + tap navigation.

---

## Recommended Validation Checklist (Next Steps)

1. Create Firebase project; register Android (`com.example.ministry_mobile`) and iOS apps
2. Place `google-services.json` and `GoogleService-Info.plist` in repo (or CI secrets)
3. Apply Google Services Gradle plugin; add `POST_NOTIFICATIONS` permission
4. Set `FIREBASE_SERVICE_ACCOUNT_JSON` in staging API env
5. Sign in on device → confirm row in `PushDeviceToken` table
6. Send Firebase Console test message → confirm foreground SnackBar
7. Background app → confirm OS notification (may require notification payload)
8. Tap notification → confirm navigation to `/notifications`
9. (Optional) Extend backend PUSH `data` with `entityType`/`entityId` for module deep links — **requires feature work, out of scope for this validation**

---

*Generated from read-only push notification validation — June 13, 2026*
