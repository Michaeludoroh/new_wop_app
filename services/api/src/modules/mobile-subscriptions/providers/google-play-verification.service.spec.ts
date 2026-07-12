import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GooglePlayVerificationService } from './google-play-verification.service';

describe('GooglePlayVerificationService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(env: Record<string, string>) {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    return new GooglePlayVerificationService(configService);
  }

  it('maps an active Google subscription from API payload', async () => {
    const service = createService({
      GOOGLE_PLAY_PACKAGE_NAME: 'com.wopp.app',
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'play@example.iam.gserviceaccount.com',
        private_key: 'test-key',
      }),
      MOBILE_ANDROID_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    jest.spyOn(
      GooglePlayVerificationService.prototype as never,
      'getAccessToken' as never,
    ).mockResolvedValue('access-token' as never);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orderId: 'GPA.123',
        startTimeMillis: '1719792000000',
        expiryTimeMillis: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autoRenewing: true,
        paymentState: 1,
        acknowledgementState: 1,
      }),
    }) as typeof fetch;

    const result = await service.verifySubscriptionPurchase(
      'wopp_premium_monthly',
      'purchase-token',
    );

    expect(result.transactionId).toBe('GPA.123');
    expect(result.status).toBe('ACTIVE');
    expect(result.autoRenewStatus).toBe(true);
  });

  it('throws when Google API verification fails', async () => {
    const service = createService({
      GOOGLE_PLAY_PACKAGE_NAME: 'com.wopp.app',
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'play@example.iam.gserviceaccount.com',
        private_key: 'test-key',
      }),
      MOBILE_ANDROID_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    jest.spyOn(
      GooglePlayVerificationService.prototype as never,
      'getAccessToken' as never,
    ).mockResolvedValue('access-token' as never);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_token' }),
    }) as typeof fetch;

    await expect(
      service.verifySubscriptionPurchase('wopp_premium_monthly', 'bad-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
