# iOS Push Notification Checklist — WOPP

**App:** WOP (`apps/mobile-flutter`)  
**Bundle ID:** `com.ministrymobile.app`  
**Firebase project:** `ministry-mobile` (`920723067172`)  
**Firebase iOS app ID:** `1:920723067172:ios:9e599c0e97fa717bc8a3b1`  
**Date:** 2026-06-17  
**Purpose:** Prepare for production push notification validation (TestFlight / App Store / staging beta)

---

## Repository Audit Summary

Static audit of the current codebase and native configuration. Items marked **Manual** require Apple Developer Portal, Firebase Console, or a physical device.

| Requirement | Repo / config status | Verdict | Action |
|-------------|----------------------|---------|--------|
| App ID `com.ministrymobile.app` | `project.pbxproj`, `GoogleService-Info.plist`, `firebase_options.dart` | **PASS** | Confirm App ID exists in Apple Developer Portal |
| Push Notifications capability | `Runner.entitlements` has `aps-environment` | **PARTIAL** | Enable **Push Notifications** in Xcode Signing & Capabilities |
| Background Modes → Remote notifications | `Info.plist` → `UIBackgroundModes` → `remote-notification` | **PASS** | None |
| Remote Notifications entitlement | `Runner/Runner.entitlements` | **PASS** | Verify embedded in signed `.ipa` (see §7) |
| Release signing configuration | No `DEVELOPMENT_TEAM` in repo; automatic signing assumed | **FAIL (repo)** | Configure team + distribution profile on build Mac |
| `aps-environment` | Currently `development` | **FAIL (prod)** | Set `production` before App Store / prod TestFlight |
| `GoogleService-Info.plist` | Present, bundle ID matches | **PASS** | None |
| APNs key in Firebase Console | Not verifiable from repo | **Manual** | Complete §4–§5 |
| Backend FCM Admin credentials | Not in local `.env` | **Manual** | Complete §6 |

**Overall production push readiness (code/config):** **NOT READY** until Apple Portal, APNs upload, release signing, and `aps-environment: production` are complete.

---

## 1. Apple Developer Portal Steps

Complete these at [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles**.

### 1.1 Register / verify App ID

- [ ] Go to **Identifiers → App IDs**.
- [ ] Confirm an App ID exists with:
  - **Description:** WOP (or Ministry Mobile)
  - **Bundle ID:** `com.ministrymobile.app` (Explicit)
- [ ] If missing, click **+** → **App IDs** → **App** → enter bundle ID `com.ministrymobile.app`.
- [ ] Under **Capabilities**, enable:
  - [ ] **Push Notifications**
- [ ] Save.

**Expected result:** App ID `com.ministrymobile.app` shows Push Notifications as enabled.

### 1.2 Create APNs Authentication Key (.p8)

See **§3** for detailed key creation steps.

### 1.3 Provisioning profiles

| Profile type | When to use | Requirements |
|--------------|-------------|--------------|
| **iOS App Development** | Local debug on device | Development cert + device UDID |
| **iOS App Store** | TestFlight + App Store | Distribution cert; Push enabled on App ID |
| **Ad Hoc** (optional) | Internal beta without TestFlight | Distribution cert + registered devices |

- [ ] **Certificates → Profiles** → create or regenerate profiles for `com.ministrymobile.app` **after** Push Notifications is enabled on the App ID.
- [ ] Download profiles to the Mac that builds release IPAs.

### 1.4 Register test devices (development / ad hoc only)

- [ ] **Devices → +** → add UDIDs for beta testers’ iPhones.
- [ ] Re-generate development/ad hoc profiles if devices were added.

---

## 2. Firebase Console Steps

Project: **ministry-mobile** → [Firebase Console](https://console.firebase.google.com/)

### 2.1 Verify iOS app registration

- [ ] **Project Settings → General → Your apps**
- [ ] Confirm iOS app:
  - **Bundle ID:** `com.ministrymobile.app`
  - **App ID:** `1:920723067172:ios:9e599c0e97fa717bc8a3b1`
- [ ] If missing, **Add app → iOS** with bundle ID `com.ministrymobile.app`, download plist, replace `apps/mobile-flutter/ios/Runner/GoogleService-Info.plist`.

### 2.2 Verify Android app (FCM parity)

- [ ] Android package: `com.ministrymobile.app`
- [ ] App ID suffix: `7fb9f48f55e68469c8a3b1`
- [ ] Ensures same FCM project sends to both platforms.

### 2.3 Cloud Messaging — Apple app configuration

- [ ] **Project Settings → Cloud Messaging** tab
- [ ] Under **Apple app configuration** for `com.ministrymobile.app`:
  - [ ] APNs Authentication Key uploaded (`.p8`) **OR** APNs certificate present
  - [ ] **Key ID** and **Team ID** entered (if using `.p8`)
- [ ] Status shows configured (no “Upload APNs key” warning).

### 2.4 Service account (backend send)

- [ ] **Project Settings → Service accounts → Generate new private key**
- [ ] Provide JSON to API deployment (see **§6**)

### 2.5 Optional: test message from Console

- [ ] **Engage → Messaging → Create campaign → Firebase Notification messages**
- [ ] Target iOS app; send to a known FCM registration token (from device smoke test)
- [ ] Use **data payload** matching app router (see `DEVICE_SMOKE_TEST_PLAN.md`)

---

## 3. APNs Key Creation Steps (Apple)

1. [ ] Sign in to [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list).
2. [ ] Click **+** to create a new key.
3. [ ] **Key Name:** e.g. `WOP APNs Key` (descriptive; not shown to users).
4. [ ] Enable **Apple Push Notifications service (APNs)**.
5. [ ] Click **Continue** → **Register**.
6. [ ] **Download** the `.p8` file immediately — **Apple allows only one download**.
7. [ ] Record:
   - **Key ID** (10-character string on the key detail page)
   - **Team ID** (Membership details or top-right of developer portal)
8. [ ] Store `.p8` securely (password manager / secrets vault — **never commit to git**).

**Notes:**

- One APNs auth key can be used for all apps in the team (recommended over per-app certificates).
- Keys do not expire; revoking requires creating and uploading a new key to Firebase.

---

## 4. APNs Key Upload Steps (Firebase)

1. [ ] Open Firebase Console → **Project Settings → Cloud Messaging**.
2. [ ] Scroll to **Apple app configuration** → select iOS app `com.ministrymobile.app`.
3. [ ] Under **APNs Authentication Key**, click **Upload**.
4. [ ] Select the `.p8` file from §3.
5. [ ] Enter **Key ID** (from Apple).
6. [ ] Enter **Team ID** (Apple Developer team).
7. [ ] Save.
8. [ ] Confirm Firebase shows the key as active (no error banner).

**Verification:**

- Send a test FCM message to an iOS device token via Firebase Console or staging API.
- If upload is wrong, FCM returns errors such as `THIRD_PARTY_AUTH_ERROR` or `InvalidRegistration` in API logs.

---

## 5. Xcode Configuration (Build Mac)

Open `apps/mobile-flutter/ios/Runner.xcworkspace` in Xcode.

### 5.1 Signing

- [ ] Select **Runner** target → **Signing & Capabilities**.
- [ ] **Team:** select your Apple Developer team (not set in repo today).
- [ ] **Bundle Identifier:** `com.ministrymobile.app`
- [ ] **Automatically manage signing:** enabled for development; for release, confirm **Release** uses **Apple Distribution** / App Store profile.

### 5.2 Capabilities

- [ ] **Push Notifications** — add if not present (should align with `Runner.entitlements`).
- [ ] **Background Modes** — ensure **Remote notifications** is checked (repo already declares this in `Info.plist`).

### 5.3 Entitlements file

Current repo file:

```
apps/mobile-flutter/ios/Runner/Runner.entitlements
  aps-environment = development
```

| Build channel | Required `aps-environment` |
|---------------|------------------------------|
| Debug / dev device | `development` |
| TestFlight (production APNs) | `production` |
| App Store | `production` |

- [ ] For **TestFlight / App Store** builds, change to:

```xml
<key>aps-environment</key>
<string>production</string>
```

- [ ] Re-archive after change; provisioning profile must include Push Notifications entitlement.

**Important:** TestFlight builds use the **production** APNs environment. A `development` entitlement causes pushes to fail silently or with APNs auth errors.

### 5.4 Build commands

**Development (device):**

```bash
cd apps/mobile-flutter
flutter pub get
flutter run --dart-define=API_BASE_URL=https://<staging-api>/api/v1
```

**Release IPA (TestFlight):**

```bash
cd apps/mobile-flutter
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://<staging-api>/api/v1
```

Upload via Xcode Organizer or Transporter.

---

## 6. Backend FCM Configuration (Required for End-to-End)

The mobile app registers tokens via authenticated API calls. The **API** must send pushes via Firebase Admin SDK.

### 6.1 Staging / production API environment

**Option A — single JSON (recommended):**

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ministry-mobile",...}
```

**Option B — split variables:**

```env
FCM_PROJECT_ID=ministry-mobile
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ministry-mobile.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- [ ] Set on staging API host (not only local `.env`).
- [ ] Restart API after change.
- [ ] Confirm `POST /push/device-token/register` succeeds from mobile (201/200).

### 6.2 Validate infrastructure script

```bash
node scripts/beta/validate-mobile-firebase.mjs
```

Target: **16/16 PASS** (currently fails on missing local Firebase Admin creds).

---

## 7. Release Entitlement Verification

After producing a release `.ipa`, verify entitlements are embedded correctly.

### 7.1 Extract and inspect entitlements

```bash
# After flutter build ipa, locate the archive or .ipa
codesign -d --entitlements :- Payload/Runner.app 2>/dev/null | grep -A1 aps-environment
```

**Expected for production beta / store:**

```xml
<key>aps-environment</key>
<string>production</string>
```

### 7.2 Checklist

- [ ] `aps-environment` is `production` in signed app (TestFlight / App Store).
- [ ] `com.apple.developer.aps-environment` matches provisioning profile.
- [ ] Push Notifications capability present on App ID and profile.
- [ ] `UIBackgroundModes` includes `remote-notification` in built `Info.plist`.
- [ ] `GoogleService-Info.plist` bundled in app; `BUNDLE_ID` = `com.ministrymobile.app`.

### 7.3 Common failure modes

| Symptom | Likely cause |
|---------|----------------|
| No token from `getToken()` | Missing plist, wrong bundle ID, or Firebase not initialized |
| Token registers but no push | Backend FCM creds missing or APNs key not in Firebase |
| Push on debug, not TestFlight | `aps-environment: development` in release build |
| Tap does not navigate | Missing `entityType` / `entityId` / `route` in FCM **data** payload |
| Permission never prompted | User denied once; reset in Settings → WOP → Notifications |

---

## 8. Production Readiness Checklist

Use this as the final gate before declaring iOS push **production-ready**.

### Apple / Xcode

- [ ] App ID `com.ministrymobile.app` exists with **Push Notifications** enabled
- [ ] APNs Authentication Key (`.p8`) created and stored securely
- [ ] Distribution / App Store provisioning profile includes push entitlement
- [ ] Xcode **Team** and **Release** signing configured on build Mac
- [ ] `Runner.entitlements` → `aps-environment: production` for release builds
- [ ] Physical iOS device test completed (simulator is not sufficient for remote push)

### Firebase

- [ ] iOS app `9e599c0e97fa717bc8a3b1` registered with bundle `com.ministrymobile.app`
- [ ] APNs key uploaded with correct Key ID + Team ID
- [ ] Service account available for API (`FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*`)
- [ ] Test message from Console or API reaches device

### Mobile app (repo — already done unless regressions)

- [ ] `GoogleService-Info.plist` present and matches bundle ID
- [ ] `Info.plist` → `UIBackgroundModes` → `remote-notification`
- [ ] FCM initializes after login; token POST to `/push/device-token/register`
- [ ] Dashboard handles foreground SnackBar + tap / opened-app navigation

### Backend

- [ ] Staging/production API has Firebase Admin credentials
- [ ] Push send path tested (announcement or admin broadcast)
- [ ] Invalid token handling verified in logs

### Validation evidence

- [ ] `node scripts/beta/validate-mobile-firebase.mjs` → 16/16
- [ ] `flutter analyze` → 0 errors
- [ ] `flutter test` → all pass
- [ ] Device smoke test completed per `DEVICE_SMOKE_TEST_PLAN.md`
- [ ] Beta tester sign-off on pass/fail sheet (see same document)

---

## 9. Go / No-Go (iOS Push)

| Stage | Verdict | Condition |
|-------|---------|-----------|
| **Development device testing** | **GO** (after §1–§4) | APNs key in Firebase + dev profile + `aps-environment: development` |
| **TestFlight beta push** | **NO-GO until** | `aps-environment: production` + App Store profile + APNs in Firebase + backend creds + device smoke PASS |
| **App Store production push** | **NO-GO until** | All §8 items checked + beta tester sheet all P0 PASS |

---

## Appendix: Key File Paths

| File | Purpose |
|------|---------|
| `apps/mobile-flutter/ios/Runner/Runner.entitlements` | `aps-environment` |
| `apps/mobile-flutter/ios/Runner/Info.plist` | Background modes |
| `apps/mobile-flutter/ios/Runner/GoogleService-Info.plist` | Firebase iOS config |
| `apps/mobile-flutter/ios/Runner.xcodeproj/project.pbxproj` | Bundle ID, signing refs |
| `apps/mobile-flutter/lib/firebase_options.dart` | Dart Firebase options |
| `apps/mobile-flutter/lib/core/notifications/services/firebase_messaging_service.dart` | FCM token lifecycle |
| `apps/mobile-flutter/lib/core/notifications/push_notification_router.dart` | Deep-link routing |
| `scripts/beta/validate-mobile-firebase.mjs` | Automated infra checks |
| `docs/pre-beta/EXTERNAL_SETUP.md` | Extended external setup guide |
