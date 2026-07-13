# FCM Setup Report

## Backend SDK

The API now uses Firebase Admin SDK:

- Package: `firebase-admin`
- Version: `^13.10.0`
- Reason: the project currently runs Node 20 in Docker and CI. Firebase Admin `14.x` requires Node 22+, so `13.10.0` is the latest compatible line.

## Backend Credentials

The API resolves Firebase Admin credentials in this order:

1. `FIREBASE_SERVICE_ACCOUNT_JSON` — inline JSON string
2. `FIREBASE_SERVICE_ACCOUNT_FILE` — path to a downloaded service account JSON file
3. `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` — split credentials

On startup (when credentials are configured), the API logs one of:

- `Firebase Admin initialized via JSON env`
- `Firebase Admin initialized via file`
- `Firebase Admin initialized via split credentials`

### Option A: Inline JSON (CI / staging / production)

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}
```

### Option A2: Service account file (local development)

1. Firebase Console → **Project Settings → Service accounts** → **Generate new private key**.
2. Save the JSON under `services/api/` (do not commit; add to `.gitignore`).
3. Set in `services/api/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_FILE=ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
```

Relative paths resolve from the API process working directory (typically `services/api/`). If the API is started from the monorepo root, paths under `services/api/` are also checked.

### Option B: Split secrets

```env
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

`FCM_PRIVATE_KEY` supports escaped newlines (`\n`) and is normalized before Firebase Admin initialization.

## Backend Env Files Updated

- `.env.example`
- `.env.staging.example`
- `.env.production.example`
- `services/api/.env.example`

All include `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_FILE`, and split `FCM_*` variables.

## Mobile Packages

Added Flutter packages:

```yaml
firebase_core: ^4.10.0
firebase_messaging: ^16.3.0
socket_io_client: ^3.1.5
```

## Mobile Native Setup Required

The code initializes Firebase defensively, but real push delivery requires platform Firebase config:

- Android: `android/app/google-services.json`
- iOS: `ios/Runner/GoogleService-Info.plist`
- Firebase project with Android/iOS app registrations.
- APNs configured in Firebase for iOS push.
- Android notification permission flow checked for Android 13+.

## Token Lifecycle

Authenticated sessions register FCM tokens through:

- `POST /api/v1/push/device-token/register`

Token refresh uses:

- `POST /api/v1/push/device-token/refresh`

Logout revokes the current token through:

- `POST /api/v1/push/device-token/revoke`

## Failure Handling

The backend invalidates tokens for permanent Firebase failures:

- `messaging/registration-token-not-registered`
- `messaging/invalid-registration-token`
- `messaging/invalid-argument`

Retryable Firebase failures are logged with `nextRetryAt` for later processing.

## Validation Checklist

- Configure Firebase Admin credentials.
- Configure native mobile Firebase files.
- Sign in on mobile and confirm token appears in `PushDeviceToken`.
- Publish announcement and confirm:
  - in-app notification exists
  - FCM push delivery log exists
  - `pushNotificationSent = true`
  - invalid tokens are revoked
- Rotate FCM token and confirm old token is revoked.
- Logout and confirm token revocation.
