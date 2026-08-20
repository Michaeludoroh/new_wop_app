import { PaymentProvider, PaymentStatus, Prisma, SubscriptionStatus, TransactionType } from '@prisma/client';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

function createLifecycleService(overrides?: { retryCandidates?: Record<string, unknown>[] }) {
  const prismaMock: any = {
    userSubscription: {
      findMany: jest.fn(async (args: { where?: { nextRetryAt?: unknown } }) => {
        if (args?.where?.nextRetryAt) {
          return overrides?.retryCandidates ?? [];
        }
        return [];
      }),
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

  const trialNotificationService = {
    processTrialReminders: jest.fn().mockResolvedValue({ sent: 0 }),
  };

  const service = new SubscriptionLifecycleService(prismaMock as never, trialNotificationService as never);
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

  it('expires registration trials without payment', async () => {
    const expiredTrial = {
      id: 'sub_trial_1',
      userId: 'user_1',
      status: SubscriptionStatus.PENDING,
      trialEndsAt: new Date(Date.now() - 60_000),
      metadata: { isRegistrationTrial: true },
    };

    const prismaMock: any = {
      userSubscription: {
        findMany: jest.fn(async (args: { where?: { status?: SubscriptionStatus; trialEndsAt?: unknown; nextRetryAt?: unknown } }) => {
          if (args?.where?.status === SubscriptionStatus.PENDING && args?.where?.trialEndsAt) {
            return [expiredTrial];
          }
          if (args?.where?.nextRetryAt) {
            return [];
          }
          return [];
        }),
        update: jest.fn(),
      },
      subscriptionStatusHistory: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction = jest.fn(async (callback: any) => callback(prismaMock));

    const trialNotificationService = {
      processTrialReminders: jest.fn().mockResolvedValue({ sent: 0 }),
    };

    const service = new SubscriptionLifecycleService(
      prismaMock as never,
      trialNotificationService as never,
    );

    const result = await service.processDueLifecycleEvents();

    expect(result.processed).toBe(1);
    expect(prismaMock.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SubscriptionStatus.EXPIRED,
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

  it('does not charge leftover card tokens and records a failed manual retry', async () => {
    const retrySubscription = {
      id: 'sub_retry_1',
      userId: 'user_1',
      status: SubscriptionStatus.GRACE,
      retryCount: 0,
      maxRetryCount: 3,
      graceEndsAt: new Date(Date.now() + 86_400_000),
      metadata: { flutterwaveToken: 'flw-token-123', billingInterval: 'MONTHLY' },
      plan: {
        id: 'plan_1',
        code: 'PREMIUM',
        amount: new Prisma.Decimal('9.99'),
        currency: 'USD',
        billingInterval: 'MONTHLY',
      },
      user: { id: 'user_1', email: 'user@example.com' },
      storeSubscription: null,
    };

    const { service, prisma } = createLifecycleService({
      retryCandidates: [retrySubscription],
    });

    const result = await service.processDueLifecycleEvents();

    expect(result.processed).toBe(1);
    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: new Prisma.Decimal('9.99'),
          transactionType: TransactionType.RETRY_CHARGE,
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.MANUAL,
          failureMessage: expect.stringContaining('Apple In-App Purchase'),
        }),
      }),
    );
  });

  it('skips store-managed Apple and Google Play subscriptions during card retry', async () => {
    const storeManaged = {
      id: 'sub_store_1',
      userId: 'user_1',
      status: SubscriptionStatus.GRACE,
      retryCount: 0,
      maxRetryCount: 3,
      storeSubscription: { id: 'store_sub_1' },
      plan: {
        id: 'plan_1',
        code: 'PREMIUM',
        amount: new Prisma.Decimal('9.99'),
        currency: 'USD',
        billingInterval: 'MONTHLY',
      },
      user: { id: 'user_1', email: 'user@example.com' },
    };

    const { service, prisma } = createLifecycleService({
      retryCandidates: [storeManaged],
    });

    const result = await service.processDueLifecycleEvents();

    expect(result.processed).toBe(1);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });
});
