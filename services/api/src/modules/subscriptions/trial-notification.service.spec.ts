import { SubscriptionStatus } from '@prisma/client';
import { TrialNotificationService } from './trial-notification.service';

function createService(activeTrials: Record<string, unknown>[] = []) {
  const prismaMock: any = {
    userSubscription: {
      findMany: jest.fn().mockResolvedValue(activeTrials),
      update: jest.fn().mockResolvedValue(undefined),
    },
    notification: {
      create: jest.fn().mockResolvedValue({
        id: 'notif_1',
        userId: 'user_1',
        title: 'title',
        body: 'body',
        channel: 'IN_APP',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  };

  const pushService = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  };

  const realtimeService = {
    emitNotificationCreated: jest.fn(),
  };

  const service = new TrialNotificationService(
    prismaMock as never,
    pushService as never,
    realtimeService as never,
  );

  return { service, prisma: prismaMock, pushService, realtimeService };
}

describe('TrialNotificationService', () => {
  const now = new Date('2026-06-04T12:00:00.000Z');

  it('sends a 3-day trial reminder once', async () => {
    const { service, prisma, pushService } = createService([
      {
        id: 'sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.PENDING,
        trialEndsAt: new Date('2026-06-07T12:00:00.000Z'),
        metadata: { isRegistrationTrial: true },
      },
    ]);

    const first = await service.processTrialReminders(now);
    const second = await service.processTrialReminders(now);

    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(pushService.sendToUser).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        category: 'SUBSCRIPTION',
        data: expect.objectContaining({ route: '/subscriptions' }),
      }),
    );
    expect(prisma.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            trialReminderThreeDaysAt: now.toISOString(),
          }),
        }),
      }),
    );
  });

  it('sends an expired trial reminder after trial ends', async () => {
    const { service, pushService } = createService([
      {
        id: 'sub_expired',
        userId: 'user_2',
        status: SubscriptionStatus.PENDING,
        trialEndsAt: new Date('2026-06-03T12:00:00.000Z'),
        metadata: { isRegistrationTrial: true },
      },
    ]);

    const result = await service.processTrialReminders(now);

    expect(result.sent).toBe(1);
    expect(pushService.sendToUser).toHaveBeenCalledWith(
      'user_2',
      expect.objectContaining({
        title: 'Your free trial has ended',
      }),
    );
  });
});
