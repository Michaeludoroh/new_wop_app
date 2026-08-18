import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppleReceiptVerificationService,
  looksLikeAppleJws,
} from './apple-receipt-verification.service';

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

  function mockFetchSequence(
    responses: Array<{
      status: number;
      environment?: string;
      latest_receipt_info?: unknown[];
      pending_renewal_info?: unknown[];
      receipt?: unknown;
    }>,
  ) {
    const fetchMock = jest.fn();
    for (const body of responses) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => body,
      });
    }
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('detects StoreKit 2 JWS payloads without treating them as receipts', () => {
    expect(looksLikeAppleJws('base64-receipt')).toBe(false);
    expect(looksLikeAppleJws('eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxIn0.signature')).toBe(true);
  });

  it('parses the latest active Apple subscription from receipt data', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    mockFetchSequence([
      {
        status: 0,
        environment: 'Sandbox',
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
      },
    ]);

    const result = await service.verifySubscriptionReceipt('base64-receipt');

    expect(result.productId).toBe('wopp_premium_monthly');
    expect(result.originalTransactionId).toBe('1000000987654321');
    expect(result.status).toBe('ACTIVE');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://buy.itunes.apple.com/verifyReceipt',
    );
  });

  it('retries sandbox when production returns 21007', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    const fetchMock = mockFetchSequence([
      { status: 21007, environment: 'Production' },
      {
        status: 0,
        environment: 'Sandbox',
        latest_receipt_info: [
          {
            product_id: 'wopp_premium_monthly',
            transaction_id: '2000000123456789',
            original_transaction_id: '1000000987654321',
            purchase_date_ms: '1719792000000',
            expires_date_ms: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
        pending_renewal_info: [{ product_id: 'wopp_premium_monthly', auto_renew_status: '1' }],
      },
    ]);

    const result = await service.verifySubscriptionReceipt('sandbox-receipt');
    expect(result.status).toBe('ACTIVE');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://buy.itunes.apple.com/verifyReceipt');
    expect(fetchMock.mock.calls[1][0]).toBe('https://sandbox.itunes.apple.com/verifyReceipt');
  });

  it('retries production when a sandbox response returns 21008', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    const fetchMock = mockFetchSequence([
      { status: 21007, environment: 'Production' },
      { status: 21008, environment: 'Sandbox' },
      {
        status: 0,
        environment: 'Production',
        latest_receipt_info: [
          {
            product_id: 'wopp_premium_monthly',
            transaction_id: '2000000123456789',
            original_transaction_id: '1000000987654321',
            purchase_date_ms: '1719792000000',
            expires_date_ms: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
        pending_renewal_info: [{ product_id: 'wopp_premium_monthly', auto_renew_status: '1' }],
      },
    ]);

    const result = await service.verifySubscriptionReceipt('production-receipt');
    expect(result.status).toBe('ACTIVE');
    expect(fetchMock.mock.calls[0][0]).toBe('https://buy.itunes.apple.com/verifyReceipt');
    expect(fetchMock.mock.calls[1][0]).toBe('https://sandbox.itunes.apple.com/verifyReceipt');
    expect(fetchMock.mock.calls[2][0]).toBe('https://buy.itunes.apple.com/verifyReceipt');
  });

  it('falls back to receipt.in_app when latest_receipt_info is empty', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    mockFetchSequence([
      {
        status: 0,
        environment: 'Sandbox',
        latest_receipt_info: [],
        receipt: {
          in_app: [
            {
              product_id: 'wopp_premium_monthly',
              transaction_id: '2000000123456789',
              original_transaction_id: '1000000987654321',
              purchase_date_ms: '1719792000000',
              expires_date_ms: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    ]);

    const result = await service.verifySubscriptionReceipt('legacy-receipt');
    expect(result.transactionId).toBe('2000000123456789');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects malformed StoreKit 2 JWS without calling verifyReceipt', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(
      service.verifySubscriptionReceipt('eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxIn0.signature'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid Apple receipt verification responses', async () => {
    const service = createService({
      APPLE_SHARED_SECRET: 'shared-secret',
      MOBILE_IOS_PREMIUM_PRODUCT_ID: 'wopp_premium_monthly',
    });

    mockFetchSequence([{ status: 21002, environment: 'Production' }]);

    await expect(service.verifySubscriptionReceipt('bad-receipt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
