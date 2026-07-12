import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  MobilePlatform,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  StoreProvider,
  StoreSubscriptionStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { MobileSubscriptionsService } from './mobile-subscriptions.service';

const premiumPlan = {
  id: 'plan_premium',
  code: 'PREMIUM',
  amount: new Prisma.Decimal(500),
  currency: 'NGN',
  isActive: true,
};

function createService(overrides?: {
  existingStore?: Record<string, unknown> | null;
  googleVerification?: Record<string, unknown>;
  appleVerification?: Record<string, unknown>;
}) {
  const tx = {
    userSubscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user_sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.ACTIVE,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'user_sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.ACTIVE,
      }),
    },
    storeSubscription: {
      upsert: jest.fn().mockImplementation(({ create, update }) => ({
        id: 'store_sub_1',
        ...(create ?? update),
      })),
      update: jest.fn().mockResolvedValue({
        id: 'store_sub_1',
        status: StoreSubscriptionStatus.ACTIVE,
      }),
    },
    storePurchaseHistory: {
      create: jest.fn().mockResolvedValue({ id: 'history_1' }),
    },
    paymentTransaction: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'payment_1' }),
    },
  };

  const prisma = {
    subscriptionPlan: {
      findUnique: jest.fn().mockResolvedValue(premiumPlan),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        email: 'user@example.com',
        fullName: 'Test User',
      }),
    },
    storeSubscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(overrides?.existingStore ?? null),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  const googlePlayVerification = {
    getConfiguredProductId: jest.fn().mockReturnValue('wopp_premium_monthly'),
    verifySubscriptionPurchase: jest.fn().mockResolvedValue({
      productId: 'wopp_premium_monthly',
      purchaseToken: 'token_abc',
      transactionId: 'GPA.123',
      purchaseDate: new Date('2026-07-01T00:00:00.000Z'),
      expiryDate: new Date('2026-08-01T00:00:00.000Z'),
      autoRenewStatus: true,
      status: 'ACTIVE',
      renewalStatus: 'AUTO_RENEWING',
      acknowledged: true,
      rawPayload: { orderId: 'GPA.123' },
      ...overrides?.googleVerification,
    }),
    acknowledgeSubscriptionPurchase: jest.fn().mockResolvedValue(undefined),
  };

  const appleReceiptVerification = {
    getConfiguredProductId: jest.fn().mockReturnValue('wopp_premium_monthly'),
    verifySubscriptionReceipt: jest.fn().mockResolvedValue({
      productId: 'wopp_premium_monthly',
      transactionId: '1000000123456789',
      originalTransactionId: '1000000987654321',
      purchaseDate: new Date('2026-07-01T00:00:00.000Z'),
      expiryDate: new Date('2026-08-01T00:00:00.000Z'),
      autoRenewStatus: true,
      status: 'ACTIVE',
      renewalStatus: 'AUTO_RENEWING',
      receiptData: 'base64-receipt',
      rawPayload: { status: 0 },
      ...overrides?.appleVerification,
    }),
  };

  const lifecycleService = {
    recordStatusChange: jest.fn().mockResolvedValue(undefined),
  };

  const subscriptionsService = {
    getMySubscription: jest.fn().mockResolvedValue({
      data: { status: SubscriptionStatus.ACTIVE },
      summary: { hasPremiumAccess: true },
    }),
  };

  const emailService = {
    send: jest.fn().mockResolvedValue({ provider: 'MOCK_SMTP', attempts: [] }),
  };

  const emailTemplateService = {
    subscriptionConfirmationEmail: jest.fn().mockReturnValue({
      subject: 'Subscription confirmed',
      body: 'body',
      html: '<p>body</p>',
    }),
  };

  const service = new MobileSubscriptionsService(
    prisma as never,
    googlePlayVerification as never,
    appleReceiptVerification as never,
    lifecycleService as never,
    subscriptionsService as never,
    emailService as never,
    emailTemplateService as never,
  );

  return {
    service,
    prisma,
    tx,
    googlePlayVerification,
    appleReceiptVerification,
    lifecycleService,
    subscriptionsService,
  };
}

describe('MobileSubscriptionsService', () => {
  it('verifies Google purchase and grants premium access', async () => {
    const { service, tx, googlePlayVerification } = createService();

    const result = await service.verifyGooglePurchase('user_1', {
      productId: 'wopp_premium_monthly',
      purchaseToken: 'token_abc',
    });

    expect(googlePlayVerification.verifySubscriptionPurchase).toHaveBeenCalledWith(
      'wopp_premium_monthly',
      'token_abc',
    );
    expect(tx.userSubscription.create).toHaveBeenCalled();
    expect(tx.storeSubscription.upsert).toHaveBeenCalled();
    expect(tx.storePurchaseHistory.create).toHaveBeenCalled();
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: PaymentProvider.GOOGLE_PLAY,
          status: PaymentStatus.SUCCESS,
        }),
      }),
    );
    expect(result.message).toContain('verified');
    expect(result.summary?.hasPremiumAccess).toBe(true);
  });

  it('rejects expired Google subscriptions', async () => {
    const { service } = createService({
      googleVerification: {
        status: 'EXPIRED',
        expiryDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    await expect(
      service.verifyGooglePurchase('user_1', {
        productId: 'wopp_premium_monthly',
        purchaseToken: 'token_abc',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks replay attacks when purchase belongs to another user', async () => {
    const { service } = createService({
      existingStore: {
        id: 'store_sub_existing',
        userId: 'other_user',
        userSubscriptionId: 'sub_other',
      },
    });

    await expect(
      service.verifyGooglePurchase('user_1', {
        productId: 'wopp_premium_monthly',
        purchaseToken: 'token_abc',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('is idempotent when the same user re-verifies a purchase', async () => {
    const { service, tx } = createService({
      existingStore: {
        id: 'store_sub_existing',
        userId: 'user_1',
        userSubscriptionId: 'sub_1',
      },
    });

    const result = await service.verifyGooglePurchase('user_1', {
      productId: 'wopp_premium_monthly',
      purchaseToken: 'token_abc',
    });

    expect(result.idempotent).toBe(true);
    expect(tx.storeSubscription.update).toHaveBeenCalled();
    expect(tx.userSubscription.create).not.toHaveBeenCalled();
  });

  it('verifies Apple receipt and syncs subscription state', async () => {
    const { service, appleReceiptVerification } = createService();

    const result = await service.verifyApplePurchase('user_1', {
      receiptData: 'base64-receipt',
    });

    expect(appleReceiptVerification.verifySubscriptionReceipt).toHaveBeenCalledWith(
      'base64-receipt',
    );
    expect(result.data.store?.provider).toBe(StoreProvider.APPLE);
  });

  it('restores Android purchases and returns status summary', async () => {
    const { service } = createService();

    const result = await service.restorePurchases('user_1', {
      platform: MobilePlatform.ANDROID,
      purchases: [
        {
          productId: 'wopp_premium_monthly',
          purchaseToken: 'token_abc',
        },
      ],
    });

    expect(result.data.results).toEqual([
      { productId: 'wopp_premium_monthly', restored: true },
    ]);
    expect(result.data.summary?.hasPremiumAccess).toBe(true);
  });
});
