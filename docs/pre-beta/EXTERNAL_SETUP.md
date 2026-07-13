# Pre-Beta External Setup Guide

Copy values into `services/api/.env` (API) and native Firebase files (mobile). Do **not** commit real secrets.

---

## 1. SMTP

**Type:** External credential + configuration change

### Steps

1. Choose a provider (SendGrid, Mailgun, Amazon SES, Postmark, or your host SMTP).
2. Verify sender domain or use provider sandbox for staging.
3. Add to `services/api/.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=no-reply@staging.example.com
APP_NAME=WOPP
WEB_APP_URL=https://staging-admin.example.com
```

4. Restart the API.
5. Verify:

```bash
# Register a test user — welcome email should arrive
curl -X POST https://staging-api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","fullName":"Test User"}'
```

6. Re-run: `node scripts/beta/validate-beta-env.mjs` — SMTP must show **PASS**.

---

## 2. Flutterwave

**Type:** External credential + configuration change + manual validation

### Steps

1. Log into [Flutterwave Dashboard](https://dashboard.flutterwave.com) → **Settings → API Keys**.
2. Copy **Secret Key** (use test/sandbox key for staging).
3. Go to **Settings → Webhooks** → set secret hash for webhook verification.
4. Add to `services/api/.env`:

```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret-hash
PAYMENT_REDIRECT_BASE_URL=https://staging-api.example.com/api/v1
```

5. Register webhook URL in Flutterwave dashboard:

```
https://staging-api.example.com/api/v1/payments/webhooks/flutterwave
```

6. Enable events: `charge.completed` (or equivalent successful payment event).

7. Verify:

```bash
cd services/api && npm test -- --testPathPatterns=beta-smoke
```

8. Complete one test checkout in browser; confirm webhook updates subscription or eBook purchase.

9. Re-run: `node scripts/beta/validate-beta-env.mjs` — Flutterwave must show **PASS**.

---

## 3. Firebase Android

**Type:** External credential requirement

### Steps

1. [Firebase Console](https://console.firebase.google.com) → Create or select **staging** project.
2. **Add app → Android**.
3. Package name: `com.ministrymobile.app` (must match `android/app/build.gradle.kts`).
4. Download **`google-services.json`**.
5. Place at:

```
apps/mobile-flutter/android/app/google-services.json
```

6. Rebuild:

```bash
cd apps/mobile-flutter
flutter clean
flutter pub get
flutter run --dart-define=API_BASE_URL=https://staging-api.example.com/api/v1
```

7. Gradle applies `com.google.gms.google-services` automatically when the file exists.

8. Re-run: `node scripts/beta/validate-mobile-firebase.mjs` — Android `google-services.json` must **PASS**.

---

## 4. Firebase iOS

**Type:** External credential requirement

### Steps

1. Firebase Console → **Add app → iOS**.
2. Bundle ID: `com.ministrymobile.app` (must match Xcode `PRODUCT_BUNDLE_IDENTIFIER`).
3. Download **`GoogleService-Info.plist`**.
4. Place at:

```
apps/mobile-flutter/ios/Runner/GoogleService-Info.plist
```

5. Open `apps/mobile-flutter/ios/Runner.xcworkspace` in Xcode.
6. Confirm **Signing & Capabilities** includes **Push Notifications** (repo includes `Runner.entitlements` with `aps-environment`).
7. Build on physical device:

```bash
cd apps/mobile-flutter
flutter run --dart-define=API_BASE_URL=https://staging-api.example.com/api/v1
```

8. Re-run: `node scripts/beta/validate-mobile-firebase.mjs` — iOS plist must **PASS**.

---

## 5. Firebase Admin Credentials (API)

**Type:** External credential requirement

### Option A — Inline service account JSON (CI / staging / production)

1. Firebase Console → **Project Settings → Service accounts**.
2. **Generate new private key** → download JSON.
3. Set in `services/api/.env` as a single-line JSON string:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
```

### Option A2 — Service account file (local development)

1. Download the service account JSON from Firebase Console.
2. Place it in `services/api/` (keep out of git).
3. Set in `services/api/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_FILE=ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
```

Resolution order: `FIREBASE_SERVICE_ACCOUNT_JSON` is checked first, then `FIREBASE_SERVICE_ACCOUNT_FILE`, then split `FCM_*` variables.

### Option B — Split environment variables

```env
FCM_PROJECT_ID=your-firebase-project-id
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

4. Restart API.
5. Test: publish an announcement in admin → device should receive push (after mobile native config is in place).
6. Re-run: `node scripts/beta/validate-mobile-firebase.mjs` — Firebase Admin must **PASS**.

---

## 6. APNs (Apple Push Notification service)

**Type:** External credential requirement + manual validation

### Steps

1. [Apple Developer](https://developer.apple.com) → **Certificates, Identifiers & Profiles → Keys**.
2. Create key with **Apple Push Notifications service (APNs)** enabled → download `.p8` file.
3. Note **Key ID** and **Team ID**.
4. Firebase Console → **Project Settings → Cloud Messaging → Apple app configuration**.
5. Upload APNs Authentication Key (`.p8`), enter Key ID and Team ID.
6. In Xcode (Runner target): confirm **Push Notifications** capability is enabled.
7. Repo includes `ios/Runner/Runner.entitlements` with `aps-environment` = `development` (use `production` for App Store builds).
8. Test on **physical iOS device** (simulator unreliable for remote push).
9. Verify: login → grant notification permission → FCM token registers → push received → tap opens deep link.

---

## 7. eBook Streaming (P0 companion)

**Type:** Configuration change

```env
CONTENT_ACCESS_SECRET=replace_with_at_least_32_random_characters
API_PUBLIC_URL=https://staging-api.example.com
```

Verify: mobile opens eBook via stream URL; unauthenticated `GET /api/v1/uploads/ebooks/file/*` returns **403**.

---

## 8. Mobile Staging API URL

**Type:** Configuration change (build-time)

Mobile uses `--dart-define=API_BASE_URL=...` at build time:

```bash
node scripts/beta/build-mobile-staging.mjs https://staging-api.example.com/api/v1
```

---

## Validation Commands

```bash
node scripts/beta/setup-staging-db.mjs
node scripts/beta/verify-policy-seed.mjs
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
cd services/api && npm test -- --testPathPatterns=beta-smoke
```

**Beta cleared when:** `validate-pre-beta.mjs` exits 0 (all automated PASS + no MANUAL items remaining).
