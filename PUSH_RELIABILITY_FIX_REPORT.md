# Push Reliability Fix Report

**Date:** 2026-06-17  
**App:** WOP (`apps/mobile-flutter`)  
**Scope:** P1 push-notification reliability improvements from `FIREBASE_RUNTIME_AUDIT_REPORT.md`

---

## Summary

Two reliability gaps were fixed:

1. **Background message handler** — registered in `main()` before `runApp()`, per Firebase requirement.
2. **Cold-start notification taps** — `getInitialMessage()` results are buffered until the dashboard subscribes to `openedMessages`, eliminating the broadcast-stream race.

Existing push routing (`PushNotificationRouter`, foreground SnackBar, `onMessageOpenedApp`) is unchanged.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/mobile-flutter/lib/main.dart` | Call `registerFirebaseMessagingBackgroundHandler()` after Firebase bootstrap, before `runApp()` |
| `apps/mobile-flutter/lib/core/notifications/services/firebase_messaging_service.dart` | Add `registerFirebaseMessagingBackgroundHandler()`; remove late `onBackgroundMessage` registration; buffer cold-start messages; add `markOpenedMessageListenersReady()` |
| `apps/mobile-flutter/lib/screens/dashboard_screen.dart` | Call `markOpenedMessageListenersReady()` after subscribing to `openedMessages` |

## Files Added

| File | Purpose |
|------|---------|
| `apps/mobile-flutter/test/core/notifications/firebase_messaging_service_test.dart` | Unit tests for cold-start buffering and delivery ordering |

---

## Implementation Details

### 1. Background handler in `main()`

**Before:** `FirebaseMessaging.onBackgroundMessage(...)` was registered inside `FirebaseMessagingService.initialize()`, which runs only after login. Terminated-app background delivery could miss handler registration.

**After:**

```dart
// main.dart
await FirebaseBootstrap.initialize();
registerFirebaseMessagingBackgroundHandler();
runApp(...);
```

```dart
// firebase_messaging_service.dart
void registerFirebaseMessagingBackgroundHandler() {
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
}
```

The top-level `firebaseMessagingBackgroundHandler` (with `@pragma('vm:entry-point')`) still re-initializes Firebase in the background isolate. Registration is removed from `initialize()` to avoid duplicate registration.

### 2. Cold-start message buffering

**Before:** `getInitialMessage()` immediately pushed to a **broadcast** `openedMessages` stream. If `DashboardScreen` had not yet subscribed (common on cold start), the event was lost.

**After:** Coordinator pattern inside `FirebaseMessagingService`:

| State | Behavior |
|-------|----------|
| `_pendingColdStartMessage` | Holds the `getInitialMessage()` result until delivery |
| `_openedMessageListenersReady` | Set by dashboard after stream subscription |
| `_bufferColdStartMessage()` | Stores message; attempts delivery if listeners ready |
| `_deliverPendingColdStartMessageIfNeeded()` | Emits to `openedMessages` only when both buffer and ready flag are set |
| `markOpenedMessageListenersReady()` | Called from dashboard; flushes pending tap |

**Ordering handled:**

- **FCM init completes first** → message buffered → dashboard subscribes → `markOpenedMessageListenersReady()` → stream event → navigation.
- **Dashboard ready first** → `markOpenedMessageListenersReady()` → FCM init completes → buffer → immediate delivery → navigation.

**Unchanged paths:**

- `FirebaseMessaging.onMessage` → foreground SnackBar (dashboard listener)
- `FirebaseMessaging.onMessageOpenedApp` → direct stream emit (app backgrounded; dashboard usually mounted)
- `PushNotificationRouter.resolveRoute()` → same route resolution for all opened-message sources

### 3. Dashboard integration

```dart
_openedPushSub ??= messaging.openedMessages.listen(...);
messaging.markOpenedMessageListenersReady();
```

Subscription is established **before** marking ready, so flushed cold-start events reach the listener.

---

## Tests Added

`test/core/notifications/firebase_messaging_service_test.dart` — 3 tests:

| Test | Validates |
|------|-----------|
| Buffers until listeners ready | No stream event until `markOpenedMessageListenersReady()` |
| Delivers immediately when ready first | Buffer after ready flag emits on next microtask |
| Single delivery | Repeated `markOpenedMessageListenersReady()` does not re-emit |

Uses `@visibleForTesting stageColdStartMessageForTesting()` to exercise buffering without Firebase initialization.

Existing `push_notification_router_test.dart` (7 tests) unchanged — routing behavior preserved.

---

## Validation Results

| Check | Result |
|-------|--------|
| `flutter analyze` | **0 errors** (23 pre-existing info-level hints) |
| `flutter test` | **54/54 passed** (+3 new tests vs prior 51) |
| Push routing regression | Covered by existing router tests |
| Cold-start buffering | 3 new unit tests pass |

---

## Remaining Push Risks

| Risk | Severity | Notes |
|------|----------|-------|
| iOS `aps-environment: development` | **High** (prod) | Must switch to `production` for TestFlight/App Store — see `IOS_PUSH_NOTIFICATION_CHECKLIST.md` |
| APNs key not in Firebase Console | **High** | External setup; blocks iOS delivery |
| Backend FCM Admin credentials | **High** | API cannot send without `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*` |
| No device E2E proof yet | **Medium** | Run `DEVICE_SMOKE_TEST_PLAN.md` on physical devices |
| Background handler is init-only | **Low** | Handler re-inits Firebase; does not display OS notifications or route — acceptable for data-only payloads |
| FCM init still post-login | **Low** | By design (token register requires JWT); cold-start tap works for restored sessions once dashboard mounts |
| Unauthenticated cold start from notification | **Low** | User may land on auth screen first; tap routing applies after login + dashboard if session restores |
| Android release debug signing | **Medium** | Unrelated to this fix; required before Play Store |

---

## Recommended Next Steps

1. Run device smoke tests (`DEVICE_SMOKE_TEST_PLAN.md`) — especially **P0-8 cold-start tap**.
2. Complete iOS APNs + production entitlements (`IOS_PUSH_NOTIFICATION_CHECKLIST.md`).
3. Configure staging API Firebase Admin credentials and re-run `node scripts/beta/validate-mobile-firebase.mjs` (target 16/16).

---

## Go / No-Go (Post-Fix)

| Context | Verdict |
|---------|---------|
| Code / CI push reliability fixes | **GO** |
| Production push on devices | **NO-GO** until external APNs/backend setup + device smoke P0 pass |
