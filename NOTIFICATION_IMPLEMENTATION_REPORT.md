# Notification Implementation Report

## Scope

Milestone 4 replaces simulated push/realtime behavior with a production notification pipeline using Firebase Cloud Messaging and authenticated Socket.IO.

## Backend Delivery Pipeline

Published announcements now trigger a unified delivery flow:

1. Create or reuse a durable broadcast in-app notification.
2. Emit `announcement.published` over Socket.IO.
3. Emit `notification.created` over Socket.IO.
4. Send FCM push notifications to active device tokens.
5. Persist each push attempt in `PushDeliveryLog`.
6. Mark announcement `pushNotificationSent` after first push dispatch.
7. Prevent duplicate push dispatch through `dedupeKey`.

Implemented in:

- `services/api/src/modules/announcements/announcements.service.ts`
- `services/api/src/modules/notifications/notifications.service.ts`
- `services/api/src/modules/push/push.service.ts`
- `services/api/src/modules/realtime/realtime.gateway.ts`
- `services/api/src/modules/realtime/realtime.service.ts`

## Firebase Cloud Messaging

The previous simulated FCM provider was replaced with Firebase Admin SDK multicast delivery.

Features:

- Secure credential loading.
- Multicast token sends.
- Success/failure mapping.
- Retryable error classification.
- Invalid token invalidation.
- Lazy Firebase initialization so local API startup does not require FCM credentials until push is sent.

Implemented in:

- `services/api/src/modules/push/push.providers/fcm.provider.ts`
- `services/api/package.json`
- `services/api/package-lock.json`

## Device Token Lifecycle

Existing endpoints are now backed by reliability behavior:

- `POST /api/v1/push/device-token/register`
- `POST /api/v1/push/device-token/refresh`
- `POST /api/v1/push/device-token/revoke`
- `GET /api/v1/push/my-devices`

Token handling:

- Users cannot claim another user’s token.
- Refresh revokes the old token and upserts the new token.
- Revocation marks `revokedAt`.
- FCM invalid-token errors revoke active tokens automatically.

## Retry and Reliability

Push delivery logs now store:

- `status`
- `success`
- `retryable`
- `retryCount`
- `nextRetryAt`
- provider error details
- payload snapshot

`PushService.retryDueDeliveries()` processes retryable failed delivery logs and updates status to `SENT`, `RETRYING`, or `FAILED`.

## Flutter Mobile

Mobile now includes:

- Firebase Core.
- Firebase Messaging.
- Socket.IO client.
- Firebase token registration after authenticated bootstrap/login/register.
- Token revocation on logout.
- Foreground message stream.
- Opened/terminated notification stream.
- Authenticated Socket.IO connection with reconnect token refresh.

Implemented in:

- `apps/mobile-flutter/pubspec.yaml`
- `apps/mobile-flutter/lib/core/auth/auth_provider.dart`
- `apps/mobile-flutter/lib/core/notifications/services/firebase_messaging_service.dart`
- `apps/mobile-flutter/lib/core/notifications/services/realtime_notifications_service.dart`

## Socket.IO Realtime

The mobile realtime service no longer polls `/realtime/health`. It connects to `/realtime` with the access token and listens for:

- `notification.created`
- `notification.updated`
- `notification.read_state_changed`
- `announcement.published`
- `realtime.error`

Initial REST notification loading remains as a fallback and bootstrap path.

## Tests Added

- `services/api/src/modules/push/push.service.spec.ts`
- `services/api/src/modules/announcements/announcements.service.spec.ts`
- `services/api/src/modules/notifications/notifications.service.spec.ts`
- `services/api/src/modules/realtime/realtime.gateway.spec.ts`

Coverage includes:

- token registration
- token refresh
- token revocation
- delivery success logging
- invalid token invalidation
- retry processing
- duplicate push prevention
- announcement publish delivery
- duplicate notification prevention
- Socket.IO auth and reconnect tracking

## Remaining Work

- Add local notification display for foreground FCM messages if visible in-app banners are required.
- Add a scheduler/worker command to call `retryDueDeliveries()` periodically.
- Add native Firebase config files for each mobile platform.
- Run physical-device foreground/background/terminated validation.
