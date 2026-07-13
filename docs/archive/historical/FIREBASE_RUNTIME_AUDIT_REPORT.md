# Firebase & Mobile Runtime Audit Report

**Date:** 2026-06-16  
**App:** WOP (`apps/mobile-flutter`)  
**Package / Bundle ID:** `com.ministrymobile.app`  
**Firebase Project:** `ministry-mobile` (`920723067172`)  
**Audit type:** Static code + configuration analysis (no physical device E2E in this session)

---

## Executive Summary

| Area | Code readiness | Config alignment | Device E2E verified |
|------|----------------|------------------|---------------------|
| Firebase initialization | **PASS** | **PASS** | Not run |
| Authentication | **PASS** | N/A (API-dependent) | Not run |
| Push notifications | **PARTIAL** | **PASS** | Not run |
| Runtime stability (screens) | **PASS** | N/A | Widget tests only |
| CI (`flutter analyze` / `flutter test`) | **PASS** | N/A | 51/51 tests |

### Go / No-Go Recommendation

| Context | Verdict | Rationale |
|---------|---------|-----------|
| **Internal QA / staging build (code + CI)** | **GO** | Config files aligned; 0 analyze errors; 51 tests pass; auth/FCM plumbing present |
| **Production push on iOS/Android devices** | **NO-GO** | No device-level FCM/APNs validation in this audit; iOS `aps-environment` is `development`; backend FCM Admin creds not confirmed locally |
| **App Store / Play Store release** | **CONDITIONAL GO** | After completing manual iOS/APNs tasks, production entitlements, release signing, and device smoke tests below |

---

## 1. Firebase Initialization

### 1.1 Configuration cross-check (aligned)

| Field | `firebase_options.dart` | `google-services.json` | `GoogleService-Info.plist` | Gradle / Xcode |
|-------|-------------------------|------------------------|----------------------------|----------------|
| Project ID | `ministry-mobile` | `ministry-mobile` | `ministry-mobile` | — |
| Sender ID | `920723067172` | `920723067172` | `920723067172` | — |
| Android app ID | `…7fb9f48f55e68469c8a3b1` | `…7fb9f48f55e68469c8a3b1` | — | — |
| iOS app ID | `…9e599c0e97fa717bc8a3b1` | — | `…9e599c0e97fa717bc8a3b1` | — |
| Android package | — | `com.ministrymobile.app` | — | `applicationId` ✅ |
| iOS bundle ID | `com.ministrymobile.app` | — | `com.ministrymobile.app` | `PRODUCT_BUNDLE_IDENTIFIER` ✅ |
| Android API key | `AIzaSyCTp0f…` | `AIzaSyCTp0f…` | — | — |
| iOS API key | `AIzaSyDDBse…` | — | `AIzaSyDDBse…` | — |

`firebase.json` references the same Android/iOS app IDs as `firebase_options.dart`.

**Finding:** All three Firebase config sources are **consistent** for production package `com.ministrymobile.app`.

### 1.2 Android startup path

| Step | Implementation | Status |
|------|----------------|--------|
| Native config | `android/app/google-services.json` present | ✅ |
| Gradle plugin | Conditional `com.google.gms.google-services` when file exists | ✅ |
| Package match | `com.ministrymobile.app` in Gradle + JSON | ✅ |
| Permissions | `POST_NOTIFICATIONS` in `AndroidManifest.xml` | ✅ |
| Dart bootstrap | `main()` → `FirebaseBootstrap.initialize()` before `runApp` | ✅ |
| Failure mode | Bootstrap catches errors; app continues without crash | ✅ (degraded) |

**Risk (low):** If Firebase init fails silently, push features no-op; no user-visible error.

### 1.3 iOS startup path

| Step | Implementation | Status |
|------|----------------|--------|
| Native config | `ios/Runner/GoogleService-Info.plist` present | ✅ |
| Bundle ID match | Plist + Xcode + `firebase_options.iosBundleId` | ✅ |
| Background mode | `UIBackgroundModes` → `remote-notification` in `Info.plist` | ✅ |
| Push entitlements | `Runner.entitlements` → `aps-environment` | ✅ **development** |
| Dart bootstrap | Same as Android via `main()` | ✅ |

**Risk (medium — release):** `aps-environment` is **`development`**. App Store / TestFlight production push requires **`production`** entitlement and matching provisioning profile.

### 1.4 `FirebaseBootstrap` behavior

```dart
// lib/core/firebase/firebase_bootstrap.dart
await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
```

- Called from `main()` before auth bootstrap ✅
- Sets `isConfigured = true` only on success ✅
- `FirebaseMessagingService` lazily accesses `FirebaseMessaging.instance` only when configured ✅ (fixed in BUILD_FIX)

**Validation script:** `node scripts/beta/validate-mobile-firebase.mjs` → **94% (15/16)**  
Only failure: missing local `FIREBASE_SERVICE_ACCOUNT_JSON` / `FCM_*` in `services/api/.env` (backend, not mobile).

---

## 2. Authentication

### 2.1 Flow summary

| Flow | Mobile entry | API endpoint | Token persistence | Tests |
|------|--------------|--------------|-------------------|-------|
| Register | `RegisterScreen` → `AuthProvider.register` | `POST /auth/register` | Secure storage | `register_screen_test.dart` ✅ |
| Login | `LoginScreen` → `AuthProvider.login` | `POST /auth/login` | Secure storage | `login_screen_test.dart` ✅ |
| Logout | Dashboard / Home → `AuthProvider.logout` | `POST /auth/logout` + FCM revoke | Clears secure storage | `home_screen_logout_test.dart` ✅ |
| Forgot password | `ForgotPasswordScreen` | `POST /auth/forgot-password` | N/A | `forgot_password_screen_test.dart` ✅ |
| Reset password | `ResetPasswordScreen` | `POST /auth/reset-password` | N/A | `reset_password_screen_test.dart` ✅ |
| Session restore | `main()` → `AuthProvider.bootstrap` | `GET /auth/me` + refresh | Reads secure storage | `auth_provider_bootstrap_test.dart` ✅ (4) |
| Token refresh | `refreshSession` / expiry check | `POST /auth/refresh` | Updates secure storage | `auth_provider_refresh_test.dart` ✅ (3) |

### 2.2 Session persistence

- **Storage:** `flutter_secure_storage` (`TokenStorageService`) — access token, refresh token, expiry ISO ✅
- **Bootstrap logic:** No token → unauthenticated; expired token → refresh attempt → clear on failure ✅
- **Splash routing:** Unknown/loading → `SplashScreen`; bootstrapped unauthenticated → `AuthLandingScreen`; authenticated → `DashboardScreen` (`app_splash_routing_test.dart` ✅)

### 2.3 Findings & risks

| Finding | Severity | Notes |
|---------|----------|-------|
| API base URL from `--dart-define=API_BASE_URL` | Info | Default `http://10.0.2.2:3000/api/v1` (emulator); staging/production require explicit define |
| No Firebase Auth SDK | Info | Auth is **NestJS JWT**, not Firebase Authentication — by design |
| FCM token register requires JWT | Expected | `_authorizedPost` skips if no access token — tokens register **after** login only ✅ |
| Logout revokes FCM token | ✅ | `AuthProvider.logout` → `revokeCurrentToken()` |

**Device E2E:** Not executed in this audit. Requires running API + valid credentials on emulator/device.

---

## 3. Push Notifications

### 3.1 FCM token lifecycle

| Step | Code location | Status |
|------|---------------|--------|
| Init trigger | `_setAuthenticated` → `_registerPushToken` | ✅ After login / session restore |
| Permission | `messaging.requestPermission()` in `initialize()` | ✅ (iOS + Android 13+) |
| Register | `POST /push/device-token/register` | ✅ |
| Refresh | `onTokenRefresh` → `POST /push/device-token/refresh` | ✅ |
| Revoke on logout | `POST /push/device-token/revoke` | ✅ |
| Platform enum | `ANDROID` / `IOS` / `WEB` | ✅ |

### 3.2 Foreground notifications

| Behavior | Implementation | Status |
|----------|----------------|--------|
| Listener | `FirebaseMessaging.onMessage` → `foregroundMessages` stream | ✅ |
| UI | `DashboardScreen` shows `SnackBar` with optional **Open** action | ✅ |
| Routing | `PushNotificationRouter.resolveRoute(message.data)` | ✅ |

**Gap:** FCM `initialize()` runs only after authentication. Dashboard binds listeners in `initState` post-frame. If `initialize()` completes and emits before dashboard subscribes, **broadcast stream events can be missed** (cold-start / race).

### 3.3 Background notifications

| Behavior | Implementation | Status |
|----------|----------------|--------|
| Background handler | `firebaseMessagingBackgroundHandler` | ⚠️ Partial |
| Handler registration | `FirebaseMessaging.onBackgroundMessage(...)` inside `initialize()` | ⚠️ **Late registration** |
| Firebase recommendation | Register background handler in `main()` before `runApp` | ❌ Not followed |

**Risk (high — terminated app):** Background handler is registered only when `FirebaseMessagingService.initialize()` runs (post-login). Notifications received while app is **killed** may not invoke the handler reliably until this is moved to app startup.

**Note:** Background handler currently only re-initializes Firebase; it does **not** display notifications or route — acceptable for data-only handling but limits UX.

### 3.4 Notification tap routing

| Source | Handler | Status |
|--------|---------|--------|
| App in background → tap | `onMessageOpenedApp` → `openedMessages` → Dashboard navigates | ✅ |
| Cold start → tap | `getInitialMessage()` → `_openedMessages.add` | ⚠️ Race with dashboard subscription |
| Router | `PushNotificationRouter` | ✅ 7/7 tests |

**Supported routes (router + backend contract):**

| entityType | Route |
|------------|-------|
| ANNOUNCEMENT | `/announcements/details` + id |
| EVENT | `/events/details` + id |
| PROGRAM | `/programs/details` + id |
| MENTORSHIP | `/mentorship/details` + id |
| EBOOK | `/ebooks/details` + id |
| LIBRARY | `/library` |
| explicit `route` | passthrough |
| `notificationId` | `/notifications` |

Backend `buildPushData()` in `push-deep-link.util.ts` aligns with mobile router ✅

### 3.5 Deep links (OS-level)

| Type | Configured? |
|------|-------------|
| Android App Links | ❌ No `VIEW` intent filters |
| iOS Universal Links | ❌ No Associated Domains |
| In-app push deep links | ✅ Via FCM `data` payload |

Push “deep links” are **in-app navigation only**, not OS universal links.

### 3.6 Push validation status

| Check | Result |
|-------|--------|
| `push_notification_router_test.dart` | ✅ 7/7 pass |
| Device receive push | ❌ Not tested |
| Device tap → screen | ❌ Not tested |
| Backend FCM Admin creds (local) | ❌ Missing in `.env` |

---

## 4. Runtime Stability (Screens)

### 4.1 Navigation architecture

- **Entry:** `main()` → `MinistryMobileApp` → splash / auth landing / dashboard
- **Authenticated routing:** `AppRouter.onGenerateRoute` with RBAC role checks
- **Dashboard tabs:** Dashboard home, Events, Clips, Library, More

### 4.2 Screen audit

| Screen / area | Route / access | Widget tests | Notes |
|---------------|----------------|--------------|-------|
| Splash | Auto on bootstrap | `app_splash_routing_test` ✅ | Shows WOP + org subtitle |
| Dashboard | Tab 0 / authenticated home | Indirect via splash test | Push binding here |
| Events | Tab 1 + `/events` | `events_screen_test` ✅ | |
| Clips | Tab 2 + `/clips` | — | No dedicated test; screen exists |
| Library | Tab 3 + `/library` | `ebook_library_screens_test` ✅ | My Library + eBook catalog |
| Subscription | More → `/subscriptions` | `subscription_screen_test` ✅ | Not a bottom tab |
| More / About | Tab 4 + `/about` | `more_screen_test` ✅, `about_screen_test` ✅ | |
| Announcements / Programs / Mentorship | More menu | Dedicated tests ✅ | |
| Profile / Policies | App bar / routes | `profile_screen_test` ✅ | |

### 4.3 CI validation (this session)

```
flutter analyze → 0 errors, 23 info-level hints
flutter test    → 51/51 passed
```

### 4.4 Runtime risks

| Risk | Severity | Detail |
|------|----------|--------|
| API unreachable at runtime | High (ops) | App degrades to auth errors; not a code defect |
| Clip video player init | Medium | Network/asset dependent; no integration test |
| PDF reader | Medium | Requires valid ebook assets from API |
| Release Android signing | Medium | Still uses debug signing in `build.gradle.kts` |

---

## 5. Risks Summary

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | iOS `aps-environment: development` | **High** (prod) | Switch to `production` + regenerate profiles before store release |
| R2 | APNs key linked in Firebase Console | **High** | Verify in Firebase → Project Settings → Cloud Messaging |
| R3 | Background handler registered post-login | **High** | Move `onBackgroundMessage` registration to `main()` |
| R4 | Cold-start notification tap race | **Medium** | Buffer `getInitialMessage` until dashboard ready, or use replayable stream |
| R5 | No device E2E push proof | **Medium** | Run manual smoke on physical Android + iOS |
| R6 | Backend FCM credentials not in local `.env` | **Medium** | Configure `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*` for staging/prod API |
| R7 | Debug release signing (Android) | **Medium** | Configure release keystore before Play Store |
| R8 | Firebase init fails silently | **Low** | Optional: surface non-fatal banner in debug/staging |

---

## 6. Remaining Manual iOS / APNs Tasks

1. **Apple Developer Portal**
   - Confirm App ID `com.ministrymobile.app` with Push Notifications capability
   - Create/update Distribution provisioning profile

2. **APNs in Firebase Console**
   - Upload APNs Authentication Key (.p8) or certificate to Firebase → Cloud Messaging → Apple app configuration
   - Confirm linked to iOS app `9e599c0e97fa717bc8a3b1`

3. **Entitlements for release**
   - Change `Runner.entitlements` `aps-environment` from `development` → `production` for App Store builds
   - Verify Xcode Signing & Capabilities includes Push Notifications

4. **Physical device smoke (iOS)**
   - Install build → login → accept notification permission
   - Confirm FCM token appears in backend `push_device_token` table
   - Send test push from Firebase Console or API
   - Verify foreground SnackBar, background tray, and tap → correct screen

5. **Physical device smoke (Android)**
   - Same flow on Android 13+ (POST_NOTIFICATIONS prompt)
   - Verify token registration and tap routing

6. **Backend**
   - Set `FIREBASE_SERVICE_ACCOUNT_JSON` or split `FCM_*` vars on staging/production API
   - Run `node scripts/beta/validate-mobile-firebase.mjs` → target 16/16 locally if creds added

---

## 7. Validation Status Matrix

| Validation | Method | Result |
|------------|--------|--------|
| Firebase config file alignment | Static cross-check | ✅ PASS |
| Package/bundle ID alignment | Static + validate script | ✅ PASS |
| `validate-mobile-firebase.mjs` | Script run | ⚠️ 94% (backend creds missing) |
| `flutter analyze` | Automated | ✅ 0 errors |
| `flutter test` | Automated | ✅ 51/51 |
| Auth unit/widget tests | Automated | ✅ Covered |
| Push router tests | Automated | ✅ 7/7 |
| Android device Firebase init | Manual | ❌ Not run |
| iOS device Firebase init | Manual | ❌ Not run |
| FCM delivery E2E | Manual | ❌ Not run |
| Notification tap E2E | Manual | ❌ Not run |

---

## 8. Recommendations (Priority Order)

1. **P0 — Device smoke:** Android + iOS physical device push receive + tap (one module minimum).
2. **P0 — APNs:** Complete Firebase ↔ Apple APNs linkage; set production entitlements for release builds.
3. **P1 — Background handler:** Register `FirebaseMessaging.onBackgroundMessage` in `main()` (top-level, before `runApp`).
4. **P1 — Cold-start tap:** Persist `getInitialMessage` result and consume when `DashboardScreen` mounts.
5. **P1 — Backend creds:** Configure FCM Admin on staging API; re-run validation script.
6. **P2 — Release hardening:** Android release signing; remove debug signing for production.
7. **P2 — Optional:** OS-level universal links if marketing/web landing pages are needed.

---

## 9. Conclusion

The mobile app’s **Firebase configuration is internally consistent** across Dart, Android, and iOS for `com.ministrymobile.app`. **Authentication and session flows are well-tested in unit/widget tests.** **Push notification routing logic is tested**, but **device-level FCM/APNs delivery and tap navigation are not verified** in this audit.

**Recommended decision:**

- **Proceed** with staging QA and internal testing of auth + core screens (code is CI-green).
- **Do not proceed** to production push-dependent launch until manual iOS/APNs setup and device smoke tests are complete.

---

## Appendix: Key file references

| Concern | Path |
|---------|------|
| App entry + Firebase init | `lib/main.dart` |
| Firebase bootstrap | `lib/core/firebase/firebase_bootstrap.dart` |
| Firebase options | `lib/firebase_options.dart` |
| FCM service | `lib/core/notifications/services/firebase_messaging_service.dart` |
| Push router | `lib/core/notifications/push_notification_router.dart` |
| Auth provider | `lib/core/auth/auth_provider.dart` |
| Dashboard push UI | `lib/screens/dashboard_screen.dart` |
| Android Firebase JSON | `android/app/google-services.json` |
| iOS Firebase plist | `ios/Runner/GoogleService-Info.plist` |
| iOS entitlements | `ios/Runner/Runner.entitlements` |
| Validation script | `scripts/beta/validate-mobile-firebase.mjs` |
