import type { ApsAlert } from 'firebase-admin/messaging';
import { buildFcmMulticastMessage } from './fcm-multicast-message';
import type { PushMessage } from './push-provider.interface';

const sample: PushMessage = {
  title: 'Sunday service',
  body: 'Starts at 10am',
  category: 'NOTIFICATION',
  dedupeKey: 'notification.created:abc',
  data: {
    notificationId: 'abc',
    channel: 'PUSH',
  },
};

describe('buildFcmMulticastMessage', () => {
  it('keeps the cross-platform notification title and body', () => {
    const payload = buildFcmMulticastMessage(['token-a'], sample);

    expect(payload.notification?.title).toBe('Sunday service');
    expect(payload.notification?.body).toBe('Starts at 10am');
  });

  it('sends a user-visible APNs alert so iOS can display it while the app is not running', () => {
    const payload = buildFcmMulticastMessage(['token-a'], sample);
    const alert = payload.apns?.payload?.aps.alert as ApsAlert;

    expect(alert.title).toBe('Sunday service');
    expect(alert.body).toBe('Starts at 10am');
    expect(payload.apns?.payload?.aps.sound).toBe('default');
  });

  it('sets the APNs headers required for an alert push', () => {
    const payload = buildFcmMulticastMessage(['token-a'], sample);

    expect(payload.apns?.headers?.['apns-push-type']).toBe('alert');
    expect(payload.apns?.headers?.['apns-priority']).toBe('10');
  });

  it('never marks the push as silent or mutable', () => {
    const aps = buildFcmMulticastMessage(['token-a'], sample).apns?.payload?.aps;

    // The Admin SDK accepts camelCase and serialises to the hyphenated APNs keys,
    // so both spellings must be absent.
    expect(aps).not.toHaveProperty('contentAvailable');
    expect(aps).not.toHaveProperty('content-available');
    expect(aps).not.toHaveProperty('mutableContent');
    expect(aps).not.toHaveProperty('mutable-content');
  });

  it('keeps Android high priority and does not drop the data payload', () => {
    const payload = buildFcmMulticastMessage(['token-a', 'token-b'], sample);

    expect(payload.tokens).toEqual(['token-a', 'token-b']);
    expect(payload.android).toEqual({ priority: 'high' });
    expect(payload.data).toEqual({
      notificationId: 'abc',
      channel: 'PUSH',
      category: 'NOTIFICATION',
      dedupeKey: 'notification.created:abc',
    });
  });
});
