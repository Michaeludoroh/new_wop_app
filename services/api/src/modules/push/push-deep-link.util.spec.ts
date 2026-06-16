import { buildPushData, PushEntityType, resolvePushRoute } from './push-deep-link.util';

describe('push deep link utilities', () => {
  it('resolves module routes from entity types', () => {
    expect(resolvePushRoute(PushEntityType.ANNOUNCEMENT, 'ann-1')).toBe('/announcements/details');
    expect(resolvePushRoute(PushEntityType.EVENT, 'evt-1')).toBe('/events/details');
    expect(resolvePushRoute(PushEntityType.PROGRAM, 'prog-1')).toBe('/programs/details');
    expect(resolvePushRoute(PushEntityType.MENTORSHIP, 'class-1')).toBe('/mentorship/details');
    expect(resolvePushRoute(PushEntityType.LIBRARY)).toBe('/library');
  });

  it('builds push data with entityType, entityId, and route', () => {
    const data = buildPushData(
      { notificationId: 'notif-1', channel: 'PUSH' },
      {
        entityType: PushEntityType.EVENT,
        entityId: 'event-1',
      },
    );

    expect(data).toEqual({
      notificationId: 'notif-1',
      channel: 'PUSH',
      entityType: 'EVENT',
      entityId: 'event-1',
      route: '/events/details',
    });
  });

  it('prefers explicit route when provided', () => {
    const data = buildPushData(
      { notificationId: 'notif-1' },
      {
        entityType: PushEntityType.LIBRARY,
        route: '/library',
      },
    );

    expect(data.route).toBe('/library');
    expect(data.entityType).toBe('LIBRARY');
  });
});
