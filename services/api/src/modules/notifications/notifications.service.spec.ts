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
    sendBroadcast: jest.fn().mockResolvedValue({ data: { attempts: 1, success: 1 } }),
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
