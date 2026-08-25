import type { MulticastMessage } from 'firebase-admin/messaging';
import type { PushMessage } from './push-provider.interface';

/**
 * Builds the FCM multicast payload for Android + iOS.
 *
 * iOS background/terminated display requires a real APNs *alert* payload.
 * A custom `aps` that only sets `sound` overrides FCM's default conversion of
 * `notification.title/body` and can produce a non-visible push.
 *
 * Do not set `content-available` — that would make a silent wake-up, not a banner.
 */
export function buildFcmMulticastMessage(
  tokens: string[],
  message: PushMessage,
): MulticastMessage {
  const title = message.title;
  const body = message.body;

  return {
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      ...(message.data ?? {}),
      category: message.category,
      dedupeKey: message.dedupeKey,
    },
    android: {
      priority: 'high',
    },
    apns: {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
        },
      },
    },
  };
}
