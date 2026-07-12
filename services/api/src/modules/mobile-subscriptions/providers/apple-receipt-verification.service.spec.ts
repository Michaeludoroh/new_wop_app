import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppleReceiptVerificationService } from './apple-receipt-verification.service';

describe('AppleReceiptVerificationService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(env: Record<string, string>) {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    return new AppleReceiptVerificationService(configService);
  }

  it('parses the latest active Apple subscription from receipt data', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
      APPLE_USE_SANDBOX: 'true',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        latest_receipt_info: [
          {
            product_id: 'wopp_premium_monthly',
            transaction_id: '2000000123456789',
            original_transaction_id: '1000000987654321',
            purchase_date_ms: '1719792000000',
            expires_date_ms: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
        pending_renewal_info: [
          {
            product_id: 'wopp_premium_monthly',
            auto_renew_status: '1',
          },
        ],
      }),
    }) as typeof fetch;

    const result = await service.verifySubscriptionReceipt('base64-receipt');

    expect(result.productId).toBe('wopp_premium_monthly');
    expect(result.originalTransactionId).toBe('1000000987654321');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects invalid Apple receipt verification responses', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
      APPLE_USE_SANDBOX: 'true',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 21002 }),
    }) as typeof fetch;

    await expect(service.verifySubscriptionReceipt('bad-receipt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
