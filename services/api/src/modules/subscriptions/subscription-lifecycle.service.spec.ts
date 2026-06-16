import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

function createLifecycleService() {
  const prismaMock: any = {
    userSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    paymentTransaction: {
      create: jest.fn(),
    },
    subscriptionStatusHistory: {
      create: jest.fn(),
    },
  };
  prismaMock.$transaction = jest.fn(async (callback: any) => callback(prismaMock));

  const service = new SubscriptionLifecycleService(prismaMock as never);
  return { service, prisma: prismaMock };
}

describe('SubscriptionLifecycleService', () => {
  it('records subscription status history entries', async () => {
    const { service, prisma } = createLifecycleService();

    await service.recordStatusChange(prisma as never, {
      subscriptionId: 'sub_1',
      userId: 'user_1',
      fromStatus: SubscriptionStatus.ACTIVE,
      toStatus: SubscriptionStatus.GRACE,
      reason: 'Payment failed',
    });

    expect(prisma.subscriptionStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: 'sub_1',
          toStatus: SubscriptionStatus.GRACE,
        }),
      }),
    );
  });

  it('processes due lifecycle events and returns a breakdown', async () => {
    const { service } = createLifecycleService();
    const result = await service.processDueLifecycleEvents();

    expect(result.processed).toBe(0);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        trialActivations: 0,
        graceExpirations: 0,
      }),
    );
  });
});
