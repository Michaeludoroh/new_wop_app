import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubscribeDto } from '../modules/subscriptions/dto/subscribe.dto';
import { ListNotificationsQueryDto } from '../modules/notifications/dto/list-notifications-query.dto';
import { MarkNotificationReadDto } from '../modules/notifications/dto/mark-notification-read.dto';
import { CreateAnnouncementDto } from '../modules/announcements/dto/create-announcement.dto';

describe('API contract DTOs', () => {
  it('requires subscription planCode and rejects legacy plan field', async () => {
    const legacy = plainToInstance(SubscribeDto, { plan: 'PREMIUM' });
    const valid = plainToInstance(SubscribeDto, { planCode: 'PREMIUM' });

    await expect(validate(legacy)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'planCode' }),
      ]),
    );
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('uses isRead for notification read-state mutation', async () => {
    const legacy = plainToInstance(MarkNotificationReadDto, { readState: 'READ' });
    const valid = plainToInstance(MarkNotificationReadDto, { isRead: true });

    await expect(validate(legacy)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'isRead' }),
      ]),
    );
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('uses isRead, limit, and offset for notification list queries', async () => {
    const query = plainToInstance(ListNotificationsQueryDto, {
      isRead: 'true',
      limit: '25',
      offset: '50',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ isRead: true, limit: 25, offset: 50 });
  });

  it('requires announcement content instead of legacy body', async () => {
    const legacy = plainToInstance(CreateAnnouncementDto, {
      title: 'Update',
      body: 'Legacy body',
    });
    const valid = plainToInstance(CreateAnnouncementDto, {
      title: 'Update',
      content: 'Canonical content',
      category: 'GENERAL_UPDATE',
      isPublished: true,
    });

    await expect(validate(legacy)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'content' }),
      ]),
    );
    await expect(validate(valid)).resolves.toHaveLength(0);
  });
});
