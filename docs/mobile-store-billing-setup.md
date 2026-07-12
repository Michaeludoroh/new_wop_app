# Mobile Store Billing Setup

This guide describes how to configure native in-app subscriptions for the WOPP Flutter app using Google Play Billing (Android) and Apple In-App Purchase (iOS). Website subscriptions continue to use Flutterwave.

## Overview

| Platform | Billing provider | Backend verification |
|----------|------------------|----------------------|
| Android app | Google Play Billing | `POST /api/v1/mobile/subscriptions/google/verify` |
| iOS app | Apple StoreKit | `POST /api/v1/mobile/subscriptions/apple/verify` |
| Website | Flutterwave | Existing `/payments/checkout/subscription` flow |

All mobile purchases are verified server-side before premium access is granted. The mobile app never unlocks premium features based on client-side purchase callbacks alone.

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/mobile/subscriptions/google/verify` | Verify Google Play purchase token |
| POST | `/api/v1/mobile/subscriptions/apple/verify` | Verify Apple receipt |
| GET | `/api/v1/mobile/subscriptions/status` | Current store + subscription status |
| POST | `/api/v1/mobile/subscriptions/restore` | Re-verify restored purchases |

## Backend Environment Variables

Add these to the API `.env` (see root `.env.example`):

```env
# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.ministrymobile.app
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
MOBILE_ANDROID_PREMIUM_PRODUCT_ID=wopp_premium_monthly

# Apple App Store
APPLE_SHARED_SECRET=your_app_specific_shared_secret
APPLE_USE_SANDBOX=true
MOBILE_IOS_PREMIUM_PRODUCT_ID=wopp_premium_monthly
```

### Google Play service account

1. Open [Google Play Console](https://play.google.com/console).
2. Go to **Setup → API access**.
3. Link a Google Cloud project and create a service account with **Finance** permissions.
4. Grant the service account access to your app in Play Console.
5. Download the service account JSON and set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

The backend uses the [Google Play Developer API](https://developers.google.com/android-publisher) subscriptions endpoint to validate purchase tokens.

### Apple shared secret

1. Open [App Store Connect](https://appstoreconnect.apple.com/).
2. Go to **Users and Access → Integrations → In-App Purchase**.
3. Generate an app-specific shared secret.
4. Set `APPLE_SHARED_SECRET`.
5. Use `APPLE_USE_SANDBOX=true` for TestFlight/sandbox builds.

## Google Play Console Configuration

1. Create an **auto-renewable subscription** product.
2. Recommended product ID: `wopp_premium_monthly`.
3. Configure base plan, pricing, and grace period in Play Console.
4. Add license testers for sandbox purchases.
5. Ensure the app package name matches `GOOGLE_PLAY_PACKAGE_NAME`.

### Purchase acknowledgement

Google requires subscription acknowledgement within three days. The backend acknowledges unacknowledged purchases after successful verification. The Flutter app also calls `completePurchase()` after server verification.

## Apple App Store Connect Configuration

1. Create a **Subscription Group**.
2. Add an auto-renewable subscription product (e.g. `wopp_premium_monthly`).
3. Configure pricing, localizations, and review information.
4. Create sandbox tester accounts for QA.
5. Ensure the bundle ID matches the app build.

### Receipt verification

The backend posts receipts to Apple's verifyReceipt service (production, with automatic sandbox fallback on status `21007`).

## Flutter App Configuration

Product IDs are passed at build time:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=MOBILE_ANDROID_PREMIUM_PRODUCT_ID=wopp_premium_monthly \
  --dart-define=MOBILE_IOS_PREMIUM_PRODUCT_ID=wopp_premium_monthly
```

On Android and iOS, the subscription screen uses `in_app_purchase` and does not show Flutterwave checkout.

## Database Tables

| Table | Purpose |
|-------|---------|
| `StoreSubscription` | Current native store subscription per user |
| `StorePurchaseHistory` | Audit log of verification events |

Verified mobile purchases also sync into the existing `UserSubscription` table so premium guards, admin dashboards, and content access continue to work regardless of billing source.

## Security Notes

- Purchase tokens and receipts are verified with Google/Apple before premium is granted.
- Duplicate purchase tokens are rejected if already linked to another user (replay protection).
- Re-verifying the same purchase for the same user is idempotent.
- Invalid or expired subscriptions are rejected.
- Verification failures are logged server-side.

## Testing Checklist

1. Configure sandbox credentials for both stores.
2. Purchase premium on Android → verify backend returns `hasPremiumAccess: true`.
3. Purchase premium on iOS → verify receipt validation succeeds.
4. Restore purchases on a fresh install.
5. Confirm website Flutterwave checkout still works unchanged.
6. Confirm admin subscription dashboard shows mobile-originated subscriptions.

## Troubleshooting

| Issue | Likely cause |
|-------|--------------|
| `GOOGLE_CREDENTIALS_NOT_CONFIGURED` | Missing service account JSON |
| `GOOGLE_VERIFICATION_FAILED` | Invalid token or API access not granted in Play Console |
| `APPLE_VERIFICATION_FAILED` | Invalid receipt or wrong shared secret |
| `PURCHASE_ALREADY_CLAIMED` | Token/receipt linked to another account |
| Store product unavailable in app | Product ID mismatch or subscription not published |
