import {
  AnnouncementCategory,
  ContentStatus,
  Role,
} from '@prisma/client';
import { AnnouncementsService } from './announcements.service';

const announcement = {
  id: 'announcement-1',
  title: 'Sunday Service',
  body: 'Join us this Sunday.',
  imageUrl: 'https://cdn.example.com/announcements/sunday.jpg',
  category: AnnouncementCategory.NEWS,
  status: ContentStatus.DRAFT,
  isPublished: false,
  pushNotificationSent: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  adminUserId: 'admin-1',
  adminUser: {
    id: 'admin-1',
    fullName: 'Admin One',
    email: 'admin@example.com',
  },
};

function createService() {
  const prismaMock: any = {
    announcement: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(announcement),
      findMany: jest.fn().mockResolvedValue([announcement]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    $transaction: jest.fn(async (operations: unknown) => {
      if (typeof operations === 'function') {
        return operations(prismaMock);
      }
      return Promise.all(operations as Promise<unknown>[]);
    }),
  };
  const notifications = {
    deliverPublishedAnnouncement: jest.fn().mockResolvedValue({ data: { id: 'notification-1' }, duplicate: false }),
  };

  prismaMock.announcement.create.mockResolvedValue({
    ...announcement,
    status: ContentStatus.PUBLISHED,
    isPublished: true,
    publishedAt: new Date(),
  });
  prismaMock.announcement.update.mockResolvedValue({
    ...announcement,
    status: ContentStatus.PUBLISHED,
    isPublished: true,
    publishedAt: new Date(),
  });

  return {
    service: new AnnouncementsService(prismaMock as never, notifications as never),
    prisma: prismaMock,
    notifications,
  };
}

describe('AnnouncementsService persistence', () => {
  it('persists category and imageUrl on create', async () => {
    const { service, prisma } = createService();

    await service.create({ sub: 'admin-1', role: Role.ADMIN }, {
      title: 'Sunday Service',
      content: 'Join us this Sunday.',
      category: 'NEWS',
      imageUrl: 'https://cdn.example.com/announcements/sunday.jpg',
      isPublished: false,
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: AnnouncementCategory.NEWS,
          imageUrl: 'https://cdn.example.com/announcements/sunday.jpg',
          status: ContentStatus.DRAFT,
          isPublished: false,
        }),
      }),
    );
  });

  it('returns category and imageUrl in responses', async () => {
    const { service } = createService();

    const response = await service.findAdminById('announcement-1');

    expect(response.category).toBe(AnnouncementCategory.NEWS);
    expect(response.imageUrl).toBe('https://cdn.example.com/announcements/sunday.jpg');
  });

  it('applies category filter on admin list queries', async () => {
    const { service, prisma } = createService();

    await service.listAdmin({ category: 'NEWS', page: 1, limit: 20 });

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: AnnouncementCategory.NEWS,
        }),
      }),
    );
  });

  it('soft deletes announcements', async () => {
    const { service, prisma } = createService();

    await service.remove('announcement-1', { sub: 'admin-1', role: Role.ADMIN });

    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('unpublish moves published announcements back to draft', async () => {
    const { service, prisma } = createService();
    prisma.announcement.update.mockResolvedValueOnce({
      ...announcement,
      status: ContentStatus.DRAFT,
      isPublished: false,
      publishedAt: null,
    });

    const response = await service.unpublish('announcement-1', {
      sub: 'admin-1',
      role: Role.ADMIN,
    });

    expect(response.status).toBe(ContentStatus.DRAFT);
    expect(response.isPublished).toBe(false);
  });
});

describe('AnnouncementsService notification delivery', () => {
  it('delivers in-app, push, and realtime pipeline when creating a published announcement', async () => {
    const { service, notifications } = createService();

    await service.create({ sub: 'admin-1', role: Role.ADMIN }, {
      title: 'Sunday Service',
      content: 'Join us this Sunday.',
      isPublished: true,
    });

    expect(notifications.deliverPublishedAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'announcement-1',
        status: ContentStatus.PUBLISHED,
      }),
    );
  });

  it('does not deliver when updating a draft that remains unpublished', async () => {
    const { service, prisma, notifications } = createService();
    prisma.announcement.update.mockResolvedValueOnce({
      ...announcement,
      status: ContentStatus.DRAFT,
    });

    await service.update('announcement-1', { sub: 'admin-1', role: Role.ADMIN }, {
      title: 'Draft update',
    });

    expect(notifications.deliverPublishedAnnouncement).not.toHaveBeenCalled();
  });

  it('uses idempotent delivery when publish is called repeatedly', async () => {
    const { service, notifications } = createService();

    await service.publish('announcement-1', { sub: 'admin-1', role: Role.ADMIN });
    await service.publish('announcement-1', { sub: 'admin-1', role: Role.ADMIN });

    expect(notifications.deliverPublishedAnnouncement).toHaveBeenCalledTimes(2);
  });
});

describe('AnnouncementsService categories', () => {
  it('returns configured category options', async () => {
    const { service } = createService();
    const result = await service.listCategories();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toEqual(
      expect.objectContaining({ value: expect.any(String), label: expect.any(String) }),
    );
  });
});
