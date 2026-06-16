import { BadRequestException } from '@nestjs/common';
import { BillingInterval, Prisma, SubscriptionStatus } from '@prisma/client';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { SubscriptionsService } from './subscriptions.service';

function createService() {
  const lifecycleService = {
    recordStatusChange: jest.fn().mockResolvedValue(undefined),
    buildGraceEndsAt: jest.fn().mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    processDueLifecycleEvents: jest.fn(),
  } as unknown as SubscriptionLifecycleService;

  const prismaMock: any = {
    subscriptionPlan: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'plan_1',
        code: 'PREMIUM',
        isActive: true,
        amount: new Prisma.Decimal(25),
        currency: 'USD',
        billingInterval: BillingInterval.MONTHLY,
        trialPeriodDays: 0,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    subscriptionStatusHistory: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  prismaMock.$transaction = jest.fn(async (callback: any) => callback(prismaMock));

  const service = new SubscriptionsService(prismaMock as never, lifecycleService);
  return { service, prisma: prismaMock, lifecycleService };
}

describe('SubscriptionsService payment enforcement', () => {
  it('rejects direct activation for paid plans', async () => {
    const { service } = createService();

    await expect(
      service.subscribe('user_1', { planCode: 'PREMIUM' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SubscriptionsService admin analytics', () => {
  it('returns premium subscription totals', async () => {
    const { service, prisma } = createService();
    prisma.userSubscription.count.mockImplementation(async (args: { where?: { status?: SubscriptionStatus } }) => {
      if (args.where?.status === SubscriptionStatus.ACTIVE) return 4;
      if (args.where?.status === SubscriptionStatus.GRACE) return 2;
      return 0;
    });
    prisma.userSubscription.findMany.mockResolvedValue([
      { plan: { amount: new Prisma.Decimal(10) } },
      { plan: { amount: new Prisma.Decimal(15) } },
    ]);

    const analytics = await service.getAdminAnalytics();

    expect(analytics.totals.active).toBe(4);
    expect(analytics.totals.grace).toBe(2);
    expect(analytics.totals.premiumAccess).toBe(6);
    expect(analytics.totals.mrr).toBe(25);
  });
});

describe('SubscriptionsService premium access helper', () => {
  it('denies premium access when grace period has expired', async () => {
    const { service, prisma } = createService();
    prisma.userSubscription.findFirst.mockResolvedValue({
      status: SubscriptionStatus.GRACE,
      graceEndsAt: new Date(Date.now() - 60_000),
    });

    await expect(service.userHasPremiumAccess('user_1')).resolves.toBe(false);
  });
});
