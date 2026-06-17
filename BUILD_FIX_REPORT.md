# Build Fix Report

**Date:** 2026-06-16  
**Scope:** `apps/mobile-flutter` — resolve all compile/analyze errors and test failures  
**Status:** **Complete** — 0 analyze errors, 51/51 tests passing

---

## Executive Summary

All **6 flutter analyze errors** and **24 failing tests** were pre-existing issues unrelated to the package rename or branding work. Three files were modified to restore a clean build without reverting package rename, branding, or Firebase configuration.

| Check | Before | After |
|-------|--------|-------|
| `flutter analyze` errors | 6 | **0** |
| `flutter analyze` info/warnings | 24 | 23 (style hints only) |
| `flutter test` | 27 pass / 24 fail | **51 pass / 0 fail** |

---

## Original Errors (6)

### 1–3. FCM nullable receiver — `firebase_messaging_service.dart`

| Line | Error | Rule |
|------|-------|------|
| 60 | `requestPermission` invoked on nullable receiver | `unchecked_use_of_nullable_value` |
| 66 | `getInitialMessage` invoked on nullable receiver | `unchecked_use_of_nullable_value` |
| 71 | `onTokenRefresh` accessed on nullable receiver | `unchecked_use_of_nullable_value` |

**Pre-rename?** Yes — field was declared `FirebaseMessaging? _messaging` while constructor assigned a non-null value; analyzer still treated it as nullable at use sites.

**Root cause:** Type declaration (`FirebaseMessaging?`) did not match intended non-null usage after construction.

---

### 4. Undefined `theme` parameter — `main.dart`

| Line | Error |
|------|-------|
| 18 | `MinistryMobileApp(theme: AppTheme.lightTheme)` — named parameter `theme` isn't defined |

**Pre-rename?** Yes — `main.dart` passed `theme` but `MinistryMobileApp` only accepted `key`.

**Root cause:** API drift between `main.dart` and `app.dart` after refactor; widget hardcoded `AppTheme.lightTheme` internally.

---

### 5–6. Undefined `theme` parameter — tests

| File | Line | Error |
|------|------|-------|
| `test/app_splash_routing_test.dart` | 73 | Same undefined `theme` parameter |
| `test/widget_test.dart` | 77 | Same undefined `theme` parameter |

**Pre-rename?** Yes — same API mismatch as `main.dart`.

**Root cause:** Tests mirrored `main.dart` call signature that was never implemented on the widget.

---

## Original Test Failures (24)

All 24 failures shared one root cause:

```
FirebaseException: [core/no-app] No Firebase App '[DEFAULT]' has been created
  at FirebaseMessaging.instance
  at new FirebaseMessagingService (line 22)
  at new AuthProvider (line 17)
```

**Affected test files (representative):**

| Test file | Failures |
|-----------|----------|
| `test/app_splash_routing_test.dart` | 3 |
| `test/widget_test.dart` | 1 |
| `test/core/auth/auth_provider_bootstrap_test.dart` | 4 |
| `test/core/auth/auth_provider_refresh_test.dart` | 3 |
| `test/login_screen_test.dart` | 2 |
| `test/register_screen_test.dart` | 2 |
| `test/forgot_password_screen_test.dart` | 4 |
| `test/reset_password_screen_test.dart` | 3 |
| `test/home_screen_logout_test.dart` | 2 |

**Pre-rename?** Yes — `FirebaseMessagingService` constructor eagerly called `FirebaseMessaging.instance` via `messaging ?? FirebaseMessaging.instance`, which requires `Firebase.initializeApp()` not present in unit/widget tests.

**Root cause:** Eager Firebase SDK access at construction time instead of lazy access after bootstrap.

---

## Files Modified

| File | Change |
|------|--------|
| `lib/core/notifications/services/firebase_messaging_service.dart` | Lazy `_messaging` getter; defer `FirebaseMessaging.instance` until `FirebaseBootstrap.isConfigured` |
| `lib/app.dart` | Added optional `theme` parameter to `MinistryMobileApp` |

**Not modified:** `main.dart`, test files, Firebase configs, package IDs, branding files — existing call sites now compile without changes.

---

## Fixes Applied

### Fix 1: Lazy FCM messaging resolution

**File:** `firebase_messaging_service.dart`

- Replaced eager `messaging ?? FirebaseMessaging.instance` in constructor with optional `_messagingOverride` injection.
- Added `_messaging` getter that returns:
  1. Injected override (for future test doubles), or
  2. `FirebaseMessaging.instance` only when `FirebaseBootstrap.isConfigured`, or
  3. `null` (safe no-op in tests and when Firebase init fails).
- Guarded all messaging operations (`initialize`, `registerCurrentToken`, listeners) with null checks.

**Production behavior preserved:** `main()` calls `FirebaseBootstrap.initialize()` before `AuthProvider` is used; FCM initializes normally on authenticated login.

**Test behavior fixed:** `AuthProvider()` construction no longer touches Firebase SDK.

### Fix 2: `MinistryMobileApp` theme parameter

**File:** `app.dart`

```dart
class MinistryMobileApp extends StatelessWidget {
  const MinistryMobileApp({super.key, this.theme});
  final ThemeData? theme;
  // ...
  theme: theme ?? AppTheme.lightTheme,
}
```

Aligns widget API with `main.dart` and test harnesses that pass `AppTheme.lightTheme`.

---

## Validation Results

### `flutter analyze`

```
23 issues found (ran in 2.3s)
Errors: 0
```

Remaining 23 items are **info-level** only (`prefer_const_constructors`, `use_build_context_synchronously`, `deprecated_member_use`). No compile blockers.

### `flutter test`

```
00:25 +51: All tests passed!
Exit code: 0
```

All 51 tests pass including previously failing auth, splash routing, login/register/forgot/reset flows.

---

## Pre-Rename vs Branding Impact

| Issue category | Caused by package rename? | Caused by branding update? |
|----------------|---------------------------|----------------------------|
| FCM nullable errors | No | No |
| `theme` parameter errors | No | No |
| Firebase test crashes | No | No |

Package rename (`com.ministrymobile.app`) and branding changes (About screen, splash subtitle) were **not reverted** and were **not the cause** of build failures.

Firebase configuration (`firebase_options.dart`, `google-services.json`, `GoogleService-Info.plist`) was **not modified**.

---

## Remaining Blockers

**None for build/test success criteria.**

Optional follow-ups (non-blocking):

1. **Info-level lints (23)** — Add `const` constructors, fix `use_build_context_synchronously` in ebook/subscription screens, replace deprecated `value` with `initialValue` in ebook_screen.
2. **CI exit code** — `flutter analyze` exits non-zero when info issues exist depending on `--fatal-infos`; current CI uses plain `flutter analyze` which passes with 0 errors.
3. **FCM integration tests** — Consider adding tests with injected `FirebaseMessaging` mock for token lifecycle coverage.

---

## Commands Executed

```powershell
Set-Location C:\new_wop_app\apps\mobile-flutter
flutter analyze
flutter test
```

---

## Summary

| Success criterion | Met? |
|-------------------|------|
| `flutter analyze` 0 errors | Yes |
| `flutter test` all pass | Yes (51/51) |
| Package rename preserved | Yes |
| Branding preserved | Yes |
| Firebase config intact | Yes |
