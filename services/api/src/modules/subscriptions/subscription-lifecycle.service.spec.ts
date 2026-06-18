import { PaymentProvider, PaymentStatus, Prisma, SubscriptionStatus, TransactionType } from '@prisma/client';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

function createLifecycleService(overrides?: {
  retryCandidates?: Record<string, unknown>[];
  chargeResult?: Record<string, unknown>;
}) {
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

  const paymentProviderRegistry = {
    resolve: jest.fn().mockReturnValue({
      chargeTokenizedPayment: jest.fn().mockResolvedValue(
        overrides?.chargeResult ?? {
          mappedStatus: PaymentStatus.SUCCESS,
          providerReference: 'wop_retry_test',
          normalizedPayload: { status: PaymentStatus.SUCCESS },
          failureMessage: null,
        },
      ),
    }),
  };

  const service = new SubscriptionLifecycleService(
    prismaMock as never,
    paymentProviderRegistry as never,
  );
  return { service, prisma: prismaMock, paymentProviderRegistry };
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

  it('charges Flutterwave tokenized renewal with plan amount instead of placeholder zero', async () => {
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
    };

    const { service, prisma, paymentProviderRegistry } = createLifecycleService({
      retryCandidates: [retrySubscription],
    });

    const result = await service.processDueLifecycleEvents();
    const adapter = paymentProviderRegistry.resolve.mock.results[0]?.value;

    expect(result.processed).toBe(1);
    expect(adapter.chargeTokenizedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '9.99',
        currency: 'USD',
        email: 'user@example.com',
        token: 'flw-token-123',
      }),
    );
    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: new Prisma.Decimal('9.99'),
          transactionType: TransactionType.RETRY_CHARGE,
          status: PaymentStatus.SUCCESS,
        }),
      }),
    );
  });
});
