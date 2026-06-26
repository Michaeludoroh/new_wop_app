import { NotificationsService } from './notifications.service';

function createService(existingNotification: unknown = null) {
  const notification = {
    id: 'notification-1',
    userId: null,
    title: 'Announcement',
    body: 'Body',
    channel: 'IN_APP',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    notification: {
      findFirst: jest.fn().mockResolvedValue(existingNotification),
      create: jest.fn().mockResolvedValue(notification),
    },
    announcement: {
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const realtime = {
    emitAnnouncementPublished: jest.fn(),
    emitNotificationCreated: jest.fn(),
  };
  const push = {
    sendBroadcast: jest.fn().mockResolvedValue({ data: { attempts: 1, success: 1, failed: 0 } }),
    sendToUser: jest.fn().mockResolvedValue({ data: { attempts: 1, success: 1, failed: 0 } }),
  };

  return {
    service: new NotificationsService(
      prisma as never,
      realtime as never,
      push as never,
      {} as never,
      { recordNotificationFailure: jest.fn() } as never,
    ),
    prisma,
    realtime,
    push,
  };
}

describe('NotificationsService announcement delivery', () => {
  it('creates one in-app notification and dispatches push/realtime for published announcements', async () => {
    const { service, prisma, realtime, push } = createService();

    await service.deliverPublishedAnnouncement({
      id: 'announcement-1',
      title: 'Announcement',
      body: 'Body',
      publishedAt: new Date(),
      pushNotificationSent: false,
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          announcementId: 'announcement-1',
          channel: 'IN_APP',
        }),
      }),
    );
    expect(realtime.emitAnnouncementPublished).toHaveBeenCalled();
    expect(realtime.emitNotificationCreated).toHaveBeenCalled();
    expect(push.sendBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'announcement.published:announcement-1',
        data: expect.objectContaining({
          announcementId: 'announcement-1',
          notificationId: 'notification-1',
          entityType: 'ANNOUNCEMENT',
          entityId: 'announcement-1',
          route: '/announcements/details',
        }),
      }),
    );
    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { pushNotificationSent: true } }),
    );
  });

  it('prevents duplicate in-app notifications and push for already sent announcements', async () => {
    const existing = {
      id: 'notification-existing',
      userId: null,
      title: 'Announcement',
      body: 'Body',
      channel: 'IN_APP',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, prisma, push } = createService(existing);

    const result = await service.deliverPublishedAnnouncement({
      id: 'announcement-1',
      title: 'Announcement',
      body: 'Body',
      publishedAt: new Date(),
      pushNotificationSent: true,
    });

    expect(result.duplicate).toBe(true);
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(push.sendBroadcast).not.toHaveBeenCalled();
  });
});

describe('NotificationsService broadcast push delivery', () => {
  it('dispatches FCM broadcast when admin creates a PUSH channel broadcast', async () => {
    const broadcastNotification = {
      id: 'notification-broadcast-1',
      userId: null,
      title: 'Ministry Update',
      body: 'Join us this Sunday',
      channel: 'PUSH',
      isRead: false,
      createdAt: new Date('2026-06-17T12:00:00.000Z'),
      updatedAt: new Date('2026-06-17T12:00:00.000Z'),
    };
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(broadcastNotification),
      },
    };
    const realtime = {
      emitNotificationCreated: jest.fn(),
    };
    const push = {
      sendBroadcast: jest.fn().mockResolvedValue({
        message: 'Push dispatch processed',
        data: { attempts: 2, success: 2, failed: 0 },
      }),
      sendToUser: jest.fn(),
    };
    const service = new NotificationsService(
      prisma as never,
      realtime as never,
      push as never,
      {} as never,
      { recordNotificationFailure: jest.fn() } as never,
    );

    await service.createBroadcast(
      { sub: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      {
        title: 'Ministry Update',
        body: 'Join us this Sunday',
        channel: 'PUSH',
      },
    );

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          channel: 'PUSH',
        }),
      }),
    );
    expect(push.sendBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'notification.created:notification-broadcast-1',
        category: 'NOTIFICATION',
        title: 'Ministry Update',
        body: 'Join us this Sunday',
        data: expect.objectContaining({
          notificationId: 'notification-broadcast-1',
          channel: 'PUSH',
        }),
      }),
    );
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('does not call sendBroadcast for IN_APP broadcast notifications', async () => {
    const inAppNotification = {
      id: 'notification-inapp-1',
      userId: null,
      title: 'In-app only',
      body: 'No push',
      channel: 'IN_APP',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(inAppNotification),
      },
    };
    const push = {
      sendBroadcast: jest.fn(),
      sendToUser: jest.fn(),
    };
    const service = new NotificationsService(
      prisma as never,
      { emitNotificationCreated: jest.fn() } as never,
      push as never,
      {} as never,
      { recordNotificationFailure: jest.fn() } as never,
    );

    await service.createBroadcast(
      { sub: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      {
        title: 'In-app only',
        body: 'No push',
        channel: 'IN_APP',
      },
    );

    expect(push.sendBroadcast).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('dispatches targeted push via sendToUser for PUSH channel targeted notifications', async () => {
    const targetedNotification = {
      id: 'notification-targeted-1',
      userId: 'user-42',
      title: 'Personal alert',
      body: 'Your session starts soon',
      channel: 'PUSH',
      isRead: false,
      createdAt: new Date('2026-06-17T13:00:00.000Z'),
      updatedAt: new Date('2026-06-17T13:00:00.000Z'),
    };
    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(targetedNotification),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-42', role: 'USER' }),
      },
    };
    const push = {
      sendBroadcast: jest.fn(),
      sendToUser: jest.fn().mockResolvedValue({ data: { attempts: 1, success: 1, failed: 0 } }),
    };
    const service = new NotificationsService(
      prisma as never,
      { emitNotificationCreated: jest.fn() } as never,
      push as never,
      {} as never,
      { recordNotificationFailure: jest.fn() } as never,
    );

    await service.createTargeted(
      { sub: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      {
        userId: 'user-42',
        title: 'Personal alert',
        body: 'Your session starts soon',
        channel: 'PUSH',
      },
    );

    expect(push.sendToUser).toHaveBeenCalledWith(
      'user-42',
      expect.objectContaining({
        dedupeKey: 'notification.created:notification-targeted-1',
        title: 'Personal alert',
      }),
    );
    expect(push.sendBroadcast).not.toHaveBeenCalled();
  });
});
