import { PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

function createLifecycleService() {
  const paymentsService = {
    initiateSubscriptionRenewalCharge: jest.fn().mockResolvedValue({
      charged: true,
      providerReference: 'wop_retry_1',
      transactionId: 'tx_retry_1',
      status: PaymentStatus.SUCCESS,
      message: 'Renewal charge completed via Flutterwave',
    }),
  };

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

  const service = new SubscriptionLifecycleService(prismaMock as never, paymentsService as never);
  return { service, prisma: prismaMock, paymentsService };
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

  it('delegates renewal retries to Flutterwave renewal workflow', async () => {
    const { service, prisma, paymentsService } = createLifecycleService();
    const now = new Date();

    prisma.userSubscription.findMany.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (args.where.status === SubscriptionStatus.GRACE && args.where.nextRetryAt) {
        return [
          {
            id: 'sub_1',
            userId: 'user_1',
            status: SubscriptionStatus.GRACE,
            retryCount: 0,
            maxRetryCount: 3,
            metadata: {},
          },
        ];
      }
      return [];
    });

    const result = await service.processDueLifecycleEvents();

    expect(paymentsService.initiateSubscriptionRenewalCharge).toHaveBeenCalledWith({
      subscriptionId: 'sub_1',
      userId: 'user_1',
      retryAttempt: 1,
      maxRetryCount: 3,
    });
    expect(result.processed).toBeGreaterThan(0);
    expect(now).toBeInstanceOf(Date);
  });
});

describe('PaymentsService renewal charge', () => {
  it('uses plan amount and Flutterwave tokenized charge when token is available', async () => {
    const { PaymentsService } = await import('../payments/payments.service');

    const subscription = {
      id: 'sub_1',
      planId: 'plan_1',
      userId: 'user_1',
      plan: {
        id: 'plan_1',
        code: 'PREMIUM',
        amount: new Prisma.Decimal(9.99),
        currency: 'USD',
        billingInterval: 'MONTHLY',
      },
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'User One',
        deletedAt: null,
      },
    };

    const createdTransaction = {
      id: 'tx_retry',
      userId: 'user_1',
      userSubscriptionId: 'sub_1',
      providerReference: 'pending',
      amount: new Prisma.Decimal(9.99),
      currency: 'USD',
      status: PaymentStatus.PENDING,
      retryable: true,
      retryCount: 1,
      paidAt: null,
      failedAt: null,
      metadata: { purpose: 'SUBSCRIPTION', billingInterval: 'MONTHLY' },
    };

    const prisma = {
      userSubscription: {
        findUnique: jest.fn().mockResolvedValue(subscription),
      },
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tx_prev',
          status: PaymentStatus.SUCCESS,
          metadata: { paymentToken: 'flw-token-123' },
          normalizedEvent: null,
        }),
        create: jest.fn().mockImplementation((args: { data: { providerReference: string } }) => ({
          ...createdTransaction,
          providerReference: args.data.providerReference,
        })),
        findUnique: jest.fn().mockImplementation(({ where }: { where: { providerReference: string } }) => ({
          ...createdTransaction,
          providerReference: where.providerReference,
        })),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (client: unknown) => unknown) =>
        callback({
          paymentTransaction: {
            findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) => ({
              ...createdTransaction,
              id: where.id ?? createdTransaction.id,
            })),
            update: jest.fn().mockResolvedValue({
              ...createdTransaction,
              status: PaymentStatus.SUCCESS,
            }),
          },
          userSubscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub_1',
              userId: 'user_1',
              status: SubscriptionStatus.GRACE,
              maxRetryCount: 3,
            }),
            update: jest.fn(),
          },
        }),
      ),
    };

    const adapter = {
      chargeTokenizedPayment: jest.fn().mockImplementation((request: { txRef: string }) => ({
        success: true,
        providerReference: request.txRef,
        mappedStatus: PaymentStatus.SUCCESS,
        normalizedPayload: {
          amount: 9.99,
          currency: 'USD',
          txRef: request.txRef,
        },
        rawPayload: {},
      })),
    };

    const lifecycleService = {
      recordStatusChange: jest.fn(),
      buildGraceEndsAt: jest.fn().mockReturnValue(new Date()),
    };

    const service = new PaymentsService(
      prisma as never,
      { resolve: jest.fn().mockReturnValue(adapter) } as never,
      { recordPaymentFailure: jest.fn() } as never,
      { get: jest.fn() } as never,
      lifecycleService as never,
    );

    const result = await service.initiateSubscriptionRenewalCharge({
      subscriptionId: 'sub_1',
      userId: 'user_1',
      retryAttempt: 1,
      maxRetryCount: 3,
    });

    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: subscription.plan.amount,
          transactionType: 'RETRY_CHARGE',
        }),
      }),
    );
    expect(adapter.chargeTokenizedPayment).toHaveBeenCalled();
    expect(result.charged).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCESS);
  });
});
