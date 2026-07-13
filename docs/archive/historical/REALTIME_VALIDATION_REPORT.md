# Realtime Validation Report

## Realtime Architecture

Backend realtime uses Socket.IO namespace:

```text
/realtime
```

Authentication:

- Client supplies access token in Socket.IO `auth.token`.
- Reconnect attempts refresh `auth.token`.
- Backend verifies JWT before joining rooms.

Rooms:

- `user:<userId>`
- `role:<role>`
- broadcast

## Events

Mobile listens for:

- `notification.created`
- `notification.updated`
- `notification.read_state_changed`
- `announcement.published`
- `realtime.error`

Backend emits:

- notification lifecycle events from `NotificationsService`
- announcement publish events from `NotificationsService.deliverPublishedAnnouncement`

## Polling Replacement

The old Flutter realtime service periodically called `/realtime/health` and treated health data as notification refresh triggers. That has been replaced with an authenticated Socket.IO client.

Initial REST loading remains in `NotificationsProvider` so the app can bootstrap state and recover from missed realtime events.

## Reconnect Behavior

The mobile Socket.IO client:

- uses websocket transport
- enables reconnection
- refreshes token from secure storage before reconnect attempts
- stops on backend `realtime.error` events that request disconnect

Backend tests cover:

- authenticated connection room join
- reconnect tracking
- unauthorized connection rejection

## Duplicate Prevention

Backend realtime events include generated `eventId`s and the gateway maintains an in-memory dedupe cache to drop immediate duplicate emissions.

Announcement delivery prevents duplicates at the durable notification and push layers:

- `Notification.announcementId` lookup prevents duplicate in-app notification creation.
- Push `dedupeKey` prevents duplicate push dispatch.
- `Announcement.pushNotificationSent` prevents repeated push dispatch after publish.

## Validation Status

IDE diagnostics reported no linter errors for touched backend and Flutter files.

Command validation is limited by the shell instability seen in earlier milestones. The Firebase Admin install required full network permission and completed successfully, updating `services/api/package-lock.json`; direct file search confirmed `firebase-admin` is present in the API lockfile.

Latest attempted validation through a shell subagent returned no output and no exit status for:

- `services/api`: `npm run test -- --runInBand`
- `services/api`: `npm run build`
- `apps/mobile-flutter`: `flutter pub get`
- `apps/mobile-flutter`: `flutter test`

Still required in a stable environment:

- `services/api`: `npm run test -- --runInBand`
- `services/api`: `npm run build`
- `apps/mobile-flutter`: `flutter pub get`
- `apps/mobile-flutter`: `flutter test`
- physical/emulator foreground FCM delivery
- background FCM delivery
- terminated-state notification open
- Socket.IO connection/reconnect against a running API
- announcement publish delivery against real Firebase credentials

## Manual Scenario Checklist

- Sign in on mobile and confirm Socket.IO connects.
- Publish announcement from admin.
- Confirm mobile receives `announcement.published`.
- Confirm mobile receives `notification.created`.
- Confirm notification list updates without polling.
- Kill/reopen app from notification and confirm opened-message handler fires.
- Put app in background and confirm FCM push is delivered.
- Disable network, restore network, and confirm Socket.IO reconnects.
