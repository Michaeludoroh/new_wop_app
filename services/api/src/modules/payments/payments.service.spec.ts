import { BadRequestException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Prisma, SubscriptionStatus, TransactionType, WebhookProcessingStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

const successfulWebhookDto = {
  provider: PaymentProvider.FLUTTERWAVE,
  eventId: 'evt_1',
  eventType: 'charge.completed',
  signature: 'valid-secret',
  providerReference: 'wop_ref_1',
  payload: {
    event: 'charge.completed',
    data: {
      id: 1001,
      tx_ref: 'wop_ref_1',
      status: 'successful',
      amount: 25,
      currency: 'USD',
    },
  },
};

function createService(overrides?: {
  transaction?: Record<string, unknown>;
  existingWebhook?: Record<string, unknown> | null;
  signatureValid?: boolean;
}) {
  const transaction = {
    id: 'tx_1',
    userId: 'user_1',
    userSubscriptionId: 'sub_1',
    providerReference: 'wop_ref_1',
    amount: new Prisma.Decimal(25),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    paidAt: null,
    failedAt: null,
    retryable: true,
    retryCount: 0,
    metadata: { purpose: 'SUBSCRIPTION', billingInterval: 'MONTHLY' },
    ...overrides?.transaction,
  };

  const tx = {
    paymentWebhookEvent: {
      create: jest.fn().mockResolvedValue({ id: 'wh_1' }),
      update: jest.fn().mockResolvedValue({ id: 'wh_1' }),
    },
    paymentTransaction: {
      findUnique: jest.fn().mockResolvedValue(transaction),
      update: jest.fn().mockResolvedValue({ ...transaction, status: PaymentStatus.SUCCESS }),
    },
    userSubscription: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.PENDING,
        maxRetryCount: 3,
      }),
      update: jest.fn().mockResolvedValue({ id: 'sub_1', status: SubscriptionStatus.ACTIVE }),
    },
    ebook: {
      findUnique: jest.fn().mockResolvedValue({ id: 'ebook_1' }),
    },
    ebookPurchase: {
      upsert: jest.fn().mockResolvedValue({ id: 'purchase_1' }),
    },
  };

  const prisma = {
    paymentWebhookEvent: {
      findUnique: jest.fn().mockResolvedValue(overrides?.existingWebhook ?? null),
      update: jest.fn().mockResolvedValue({ id: 'wh_existing' }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  const adapter = {
    verifySignature: jest.fn().mockResolvedValue({
      isValid: overrides?.signatureValid ?? true,
      reason: overrides?.signatureValid === false ? 'Invalid Flutterwave webhook signature' : undefined,
    }),
    normalizeEvent: jest.fn().mockResolvedValue({
      provider: PaymentProvider.FLUTTERWAVE,
      externalEventId: 'evt_1',
      eventType: 'charge.completed',
      providerReference: 'wop_ref_1',
      mappedStatus: PaymentStatus.SUCCESS,
      retryable: false,
      rawPayload: successfulWebhookDto.payload,
      normalizedPayload: {
        amount: 25,
        currency: 'USD',
        txRef: 'wop_ref_1',
      },
    }),
  };

  const lifecycleService = {
    recordStatusChange: jest.fn().mockResolvedValue(undefined),
    buildGraceEndsAt: jest.fn().mockReturnValue(new Date()),
  };

  const service = new PaymentsService(
    prisma as never,
    { resolve: jest.fn().mockReturnValue(adapter) } as never,
    { recordPaymentFailure: jest.fn() } as never,
    { get: jest.fn() } as never,
    lifecycleService as never,
  );

  return { service, prisma, tx, adapter, lifecycleService };
}

describe('PaymentsService Flutterwave webhooks', () => {
  it('rejects invalid Flutterwave signatures before processing', async () => {
    const { service, prisma } = createService({ signatureValid: false });

    await expect(service.processWebhook(successfulWebhookDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('handles duplicate webhook events idempotently', async () => {
    const { service, prisma } = createService({
      existingWebhook: {
        id: 'wh_existing',
        externalEventId: 'evt_1',
        processingStatus: WebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    await expect(service.processWebhook(successfulWebhookDto)).resolves.toMatchObject({
      data: { duplicate: true, status: WebhookProcessingStatus.DUPLICATE },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('activates subscriptions only after verified matching payment success', async () => {
    const { service, tx } = createService();

    await service.processWebhook(successfulWebhookDto);

    expect(tx.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.SUCCESS,
          paidAt: expect.any(Date),
        }),
      }),
    );
    expect(tx.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects successful webhooks when amount does not match the pending transaction', async () => {
    const { service } = createService({
      transaction: { amount: new Prisma.Decimal(30) },
    });

    await expect(service.processWebhook(successfulWebhookDto)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'WEBHOOK_AMOUNT_MISMATCH' }),
    });
  });

  it('creates eBook purchase entitlement after verified payment success', async () => {
    const { service, tx } = createService({
      transaction: {
        userSubscriptionId: null,
        transactionType: TransactionType.EBOOK_PURCHASE,
        metadata: { purpose: 'EBOOK_PURCHASE', ebookId: 'ebook_1' },
      },
    });

    await service.processWebhook(successfulWebhookDto);

    expect(tx.ebookPurchase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_ebookId: { userId: 'user_1', ebookId: 'ebook_1' } },
      }),
    );
  });
});

describe('PaymentsService checkout initiation', () => {
  it('creates a pending eBook transaction before returning Flutterwave checkout URL', async () => {
    const prisma = {
      ebook: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ebook_1',
          title: 'Paid eBook',
          price: new Prisma.Decimal(10),
          deletedAt: null,
        }),
      },
      ebookPurchase: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user_1',
          email: 'user@example.com',
          fullName: 'User One',
        }),
      },
      paymentTransaction: {
        create: jest.fn().mockResolvedValue({
          id: 'tx_ebook_1',
          amount: new Prisma.Decimal(10),
          currency: 'USD',
          providerReference: 'wop_ebook_123',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'tx_ebook_1',
          status: PaymentStatus.PENDING,
          providerReference: 'wop_ebook_123',
        }),
      },
    };

    const adapter = {
      createCheckoutSession: jest.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.flutterwave.com/pay/test',
        providerReference: 'wop_ebook_123',
        rawPayload: { status: 'success' },
      }),
    };

    const lifecycleService = {
      recordStatusChange: jest.fn().mockResolvedValue(undefined),
      buildGraceEndsAt: jest.fn().mockReturnValue(new Date()),
    };

    const service = new PaymentsService(
      prisma as never,
      { resolve: jest.fn().mockReturnValue(adapter) } as never,
      { recordPaymentFailure: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('https://api.example.com/api/v1') } as never,
      lifecycleService as never,
    );

    const result = await service.initiateEbookCheckout('user_1', { ebookId: 'ebook_1' });

    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.PENDING,
          transactionType: TransactionType.EBOOK_PURCHASE,
          provider: PaymentProvider.FLUTTERWAVE,
        }),
      }),
    );
    expect(adapter.createCheckoutSession).toHaveBeenCalled();
    expect(result).toMatchObject({
      data: {
        checkoutUrl: 'https://checkout.flutterwave.com/pay/test',
        providerReference: 'wop_ebook_123',
      },
    });
  });
});
