# Package Rename Report

**Date:** 2026-06-16  
**Scope:** `apps/mobile-flutter` (canonical Flutter mobile app)  
**Status:** Rename applied; validation partially blocked by pre-existing code issues

---

## Executive Summary

The production package identifier rename from placeholder IDs to **`com.ministrymobile.app`** is complete across Android, iOS, Firebase configuration, documentation, and validation scripts.

| Area | Result |
|------|--------|
| Android `applicationId` / `namespace` | Updated to `com.ministrymobile.app` |
| iOS `PRODUCT_BUNDLE_IDENTIFIER` | Updated to `com.ministrymobile.app` |
| Firebase Android app ID | Switched to `7fb9f48f55e68469c8a3b1` |
| Firebase iOS app ID | Aligned to `9e599c0e97fa717bc8a3b1` (matches `GoogleService-Info.plist`) |
| `flutter clean` | Pass |
| `flutter pub get` | Pass (Windows symlink warning on plugin cache; non-blocking) |
| `flutter analyze` | **Fail** — 6 errors (pre-existing, unrelated to rename) |
| `flutter test` | **Fail** — 24 pass / 10 fail (pre-existing compile errors) |
| Firebase validation script | **94%** (15/16) — package ID checks pass |

---

## Previous Identifiers Discovered

| Platform | Previous ID | Firebase App ID (previous) |
|----------|-------------|----------------------------|
| Android | `com.example.ministry_mobile` | `1:920723067172:android:787c4af5da953cecc8a3b1` |
| iOS | `com.example.ministryMobile` | `1:920723067172:ios:b90790d9701f5fc4c8a3b1` |

**Note:** Android and iOS previously used inconsistent naming (snake_case vs camelCase).

---

## New Identifiers Applied

| Platform | New ID | Firebase App ID |
|----------|--------|-----------------|
| Android | `com.ministrymobile.app` | `1:920723067172:android:7fb9f48f55e68469c8a3b1` |
| iOS | `com.ministrymobile.app` | `1:920723067172:ios:9e599c0e97fa717bc8a3b1` |
| macOS (desktop parity) | `com.ministrymobile.app` | N/A |
| Linux `APPLICATION_ID` | `com.ministrymobile.app` | N/A |

**Unchanged (intentionally):** Dart pubspec name `ministry_mobile` and all `package:ministry_mobile/...` imports — this is the Dart package name, not the store application ID.

---

## Complete List of Modified Files

### Android & Kotlin

| File | Change |
|------|--------|
| `apps/mobile-flutter/android/app/build.gradle.kts` | `namespace` + `applicationId` → `com.ministrymobile.app` |
| `apps/mobile-flutter/android/app/src/main/kotlin/com/ministrymobile/app/MainActivity.kt` | **Added** — `package com.ministrymobile.app` |
| `apps/mobile-flutter/android/app/src/main/kotlin/com/example/ministry_mobile/MainActivity.kt` | **Deleted** |

### Firebase

| File | Change |
|------|--------|
| `apps/mobile-flutter/android/app/google-services.json` | Single client for `com.ministrymobile.app` / app ID `7fb9f48f...` |
| `apps/mobile-flutter/android/app/google-services.json.example` | Template updated to production package + app ID |
| `apps/mobile-flutter/lib/firebase_options.dart` | Android + iOS app IDs and `iosBundleId` updated |
| `apps/mobile-flutter/firebase.json` | FlutterFire config updated for both platforms |

### iOS

| File | Change |
|------|--------|
| `apps/mobile-flutter/ios/Runner.xcodeproj/project.pbxproj` | All `PRODUCT_BUNDLE_IDENTIFIER` → `com.ministrymobile.app` (+ RunnerTests) |
| `apps/mobile-flutter/ios/Runner/GoogleService-Info.plist.example` | Bundle ID + example app ID updated |

**Not modified:** `apps/mobile-flutter/ios/Runner/GoogleService-Info.plist` — already contained `com.ministrymobile.app` and correct iOS app ID.

### Desktop parity

| File | Change |
|------|--------|
| `apps/mobile-flutter/macos/Runner/Configs/AppInfo.xcconfig` | Bundle ID updated |
| `apps/mobile-flutter/macos/Runner.xcodeproj/project.pbxproj` | RunnerTests bundle IDs updated |
| `apps/mobile-flutter/linux/CMakeLists.txt` | `APPLICATION_ID` updated |

### Documentation

| File | Change |
|------|--------|
| `docs/pre-beta/EXTERNAL_SETUP.md` | Android + iOS Firebase setup IDs |
| `PRE_BETA_COMPLETION_REPORT.md` | Firebase registration instructions |
| `P0_CLOSURE_PLAN.md` | iOS bundle ID reference |
| `BETA_LAUNCH_FINALIZATION_REPORT.md` | Config verification notes |
| `MOBILE_INFRASTRUCTURE_READINESS_REPORT.md` | Firebase setup steps |
| `PUSH_NOTIFICATION_VALIDATION_REPORT.md` | Application ID references |

### Scripts

| File | Change |
|------|--------|
| `scripts/beta/validate-mobile-firebase.mjs` | Added package ID + Firebase app ID validation checks |

---

## Android Changes (Detail)

1. **`build.gradle.kts`**
   - `namespace = "com.ministrymobile.app"`
   - `applicationId = "com.ministrymobile.app"`

2. **MainActivity relocation**
   - From: `kotlin/com/example/ministry_mobile/MainActivity.kt`
   - To: `kotlin/com/ministrymobile/app/MainActivity.kt`

3. **`AndroidManifest.xml`**
   - No changes required — uses relative `.MainActivity` reference; no hardcoded old package.

4. **`google-services.json`**
   - Removed legacy `com.example.ministry_mobile` client entry.
   - Retained production client only.

---

## iOS Changes (Detail)

1. **`project.pbxproj`** — 6 occurrences updated:
   - Runner Debug/Release: `com.ministrymobile.app`
   - RunnerTests (3 configs): `com.ministrymobile.app.RunnerTests`

2. **`GoogleService-Info.plist`**
   - Already configured for `com.ministrymobile.app` with app ID `9e599c0e97fa717bc8a3b1`.

3. **`Runner.entitlements`**
   - Unchanged — `aps-environment: development` (switch to `production` before App Store release).

4. **Profile build configuration**
   - iOS project uses Debug/Release only in `project.pbxproj`; both updated.

---

## Firebase Changes (Detail)

| Config | Before | After |
|--------|--------|-------|
| Android package | `com.example.ministry_mobile` | `com.ministrymobile.app` |
| Android app ID | `787c4af5da953cecc8a3b1` | **`7fb9f48f55e68469c8a3b1`** |
| iOS bundle ID (`firebase_options.dart`) | `com.example.ministryMobile` | **`com.ministrymobile.app`** |
| iOS app ID | `b90790d9701f5fc4c8a3b1` | **`9e599c0e97fa717bc8a3b1`** |
| Firebase project | `ministry-mobile` | Unchanged |

**FlutterFire CLI:** Not run automatically (requires interactive Firebase auth). Manual equivalent:

```bash
cd apps/mobile-flutter
flutterfire configure --project=ministry-mobile
```

Configuration was updated manually to match existing Firebase Console registrations and on-disk `google-services.json` / `GoogleService-Info.plist`.

---

## Validation Command Results

### `flutter clean`

```
Exit code: 0 — build/, .dart_tool/, ephemeral dirs removed successfully
```

### `flutter pub get`

```
Exit code: 0 — Got dependencies!
Warning: ERROR_ACCESS_DENIED on Windows plugin symlink (connectivity_plus) — environment permission issue, non-blocking for Android/iOS builds
```

### `flutter analyze`

```
Exit code: 1 — 26 issues found (6 errors, 20 info)
```

**Errors (pre-existing, not caused by rename):**

| File | Issue |
|------|-------|
| `lib/core/notifications/services/firebase_messaging_service.dart:60,66,71` | Nullable `FirebaseMessaging?` used without null check |
| `lib/main.dart:18` | Undefined named parameter `theme` on `MinistryMobileApp` |
| `test/app_splash_routing_test.dart:73` | Same `theme` parameter issue |
| `test/widget_test.dart:77` | Same `theme` parameter issue |

### `flutter test`

```
Exit code: 1 — 24 passed, 10 failed (compilation failures in tests importing auth/FCM code paths)
```

Failures stem from the same pre-existing compile errors above, not from package rename.

### `node scripts/beta/validate-mobile-firebase.mjs`

```
Score: 94% (15/16)

PASS — Android applicationId: com.ministrymobile.app
PASS — Android google-services package name
PASS — Firebase Android app ID: 7fb9f48f55e68469c8a3b1
PASS — iOS bundle identifier in project.pbxproj
PASS — Firebase iOS bundle ID in firebase_options.dart
PASS — iOS GoogleService-Info.plist present
FAIL — Firebase Admin credentials (backend .env — expected in local dev)
```

---

## Remaining Manual Steps

1. **Apple Developer Portal**
   - Confirm App ID `com.ministrymobile.app` exists with Push Notifications capability.
   - Regenerate provisioning profiles and verify Xcode signing.

2. **Firebase Console**
   - Confirm iOS app `com.ministrymobile.app` has APNs key/certificate linked.
   - Optionally remove deprecated apps (`com.example.ministry_mobile`, `com.example.ministryMobile`) after migration validation.

3. **Device smoke tests**
   - Android: install → login → FCM token register → receive push → tap deep-link.
   - iOS: same flow on physical device.

4. **Pre-existing code fixes** (separate from rename)
   - Fix `FirebaseMessagingService` nullable `_messaging` field.
   - Restore or remove `theme` parameter on `MinistryMobileApp` / update tests.

5. **Store listings**
   - If app was previously published under old IDs, submit as a **new** Play Store / App Store listing.

6. **Git**
   - Stage new `MainActivity.kt` path: `git add apps/mobile-flutter/android/app/src/main/kotlin/com/ministrymobile/`

---

## Firebase Verification Status

| Check | Status |
|-------|--------|
| Android package in Gradle | Verified |
| Android package in `google-services.json` | Verified |
| Android Firebase app ID in `firebase_options.dart` | Verified (`7fb9f48f...`) |
| iOS bundle in Xcode project | Verified |
| iOS bundle in `firebase_options.dart` | Verified |
| iOS bundle in `GoogleService-Info.plist` | Verified (pre-existing file) |
| iOS Firebase app ID alignment | Verified (`9e599c0e...`) |
| Backend FCM Admin credentials | Not configured locally (expected) |
| OAuth clients | Empty — no Google Sign-In migration needed |

---

## Risks & Follow-Up Recommendations

| Risk | Level | Mitigation |
|------|-------|------------|
| FCM tokens invalid after reinstall | Low (pre-release) | Users re-register on login |
| iOS `aps-environment: development` | Medium | Set to `production` before App Store build |
| Root-level `android/` / `ios/` scaffold | Low | Already uses target ID; consider removing to avoid confusion |
| Pre-existing analyze/test failures | Medium | Fix FCM nullable + `theme` API drift before CI merge |
| Windows dev symlink permission | Low | Enable Developer Mode or run as admin for desktop builds |

---

## Git Diff Summary

```
18 files changed, 95 insertions(+), 54 deletions(-)
```

Key changes:
- Modified: 16 files
- Deleted: 1 (`MainActivity.kt` old path)
- Untracked: `apps/mobile-flutter/android/app/src/main/kotlin/com/ministrymobile/` (new MainActivity)

---

## Commands Executed

```powershell
Set-Location C:\new_wop_app\apps\mobile-flutter
flutter clean
flutter pub get
flutter analyze
flutter test

Set-Location C:\new_wop_app
node scripts/beta/validate-mobile-firebase.mjs
git diff --stat
```

---

## Final Summary

| Item | Status |
|------|--------|
| Package rename to `com.ministrymobile.app` | Complete |
| Firebase Android app ID `7fb9f48f55e68469c8a3b1` | Wired |
| Firebase iOS app ID `9e599c0e97fa717bc8a3b1` | Wired |
| Documentation updated | Complete |
| Validation script enhanced | Complete |
| `flutter analyze` / `flutter test` | Blocked by pre-existing errors |
| Backend API changes | None required |
