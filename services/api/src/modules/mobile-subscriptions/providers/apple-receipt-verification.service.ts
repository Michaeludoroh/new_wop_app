import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MobilePlatform, StoreProvider } from '@prisma/client';

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

export type AppleSubscriptionVerification = {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: Date;
  expiryDate: Date;
  autoRenewStatus: boolean;
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  renewalStatus: string;
  receiptData: string;
  rawPayload: Record<string, unknown>;
};

type AppleReceiptInfo = {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  purchase_date_ms?: string;
  expires_date_ms?: string;
  is_in_billing_retry_period?: string;
  expiration_intent?: string;
};

type AppleVerifyResponse = {
  status: number;
  latest_receipt_info?: AppleReceiptInfo[];
  pending_renewal_info?: Array<{
    auto_renew_status?: string;
    product_id?: string;
    expiration_intent?: string;
  }>;
  receipt?: Record<string, unknown>;
};

@Injectable()
export class AppleReceiptVerificationService {
  private readonly logger = new Logger(AppleReceiptVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifySubscriptionReceipt(receiptData: string): Promise<AppleSubscriptionVerification> {
    const normalizedReceipt = receiptData.trim();
    if (!normalizedReceipt) {
      throw new BadRequestException({
        code: 'APPLE_RECEIPT_REQUIRED',
        message: 'Apple receipt data is required',
      });
    }

    const sharedSecret = this.configService.get<string>('APPLE_SHARED_SECRET')?.trim();
    if (!sharedSecret) {
      throw new BadRequestException({
        code: 'APPLE_SHARED_SECRET_NOT_CONFIGURED',
        message: 'APPLE_SHARED_SECRET is not configured',
      });
    }

    const useSandbox = this.configService.get<string>('APPLE_USE_SANDBOX') === 'true';
    let response = await this.postReceipt(normalizedReceipt, sharedSecret, useSandbox);

    if (response.status === 21007 && !useSandbox) {
      response = await this.postReceipt(normalizedReceipt, sharedSecret, true);
    }

    if (response.status !== 0) {
      this.logger.warn(`Apple receipt verification failed with status ${response.status}`);
      throw new UnauthorizedException({
        code: 'APPLE_VERIFICATION_FAILED',
        message: `Apple receipt verification failed (status ${response.status})`,
      });
    }

    const expectedProductId = this.getConfiguredProductId();
    const latest = this.selectLatestReceiptInfo(response.latest_receipt_info ?? [], expectedProductId);

    if (!latest) {
      throw new UnauthorizedException({
        code: 'APPLE_SUBSCRIPTION_NOT_FOUND',
        message: 'No active Apple subscription found in receipt',
      });
    }

    const expiryMillis = Number(latest.expires_date_ms ?? 0);
    const purchaseMillis = Number(latest.purchase_date_ms ?? Date.now());
    const expiryDate = new Date(expiryMillis);
    const purchaseDate = new Date(purchaseMillis);
    const now = Date.now();

    const renewalInfo = (response.pending_renewal_info ?? []).find(
      (item) => item.product_id === latest.product_id,
    );
    const autoRenewStatus = renewalInfo?.auto_renew_status === '1';

    let status: AppleSubscriptionVerification['status'] = 'ACTIVE';
    if (expiryMillis <= now) {
      status = 'EXPIRED';
    } else if (latest.is_in_billing_retry_period === '1') {
      status = 'GRACE';
    } else if (renewalInfo?.auto_renew_status === '0') {
      status = 'ACTIVE';
    }

    const transactionId = String(latest.transaction_id ?? '');
    const originalTransactionId = String(latest.original_transaction_id ?? transactionId);

    return {
      productId: String(latest.product_id ?? expectedProductId),
      transactionId,
      originalTransactionId,
      purchaseDate,
      expiryDate,
      autoRenewStatus,
      status,
      renewalStatus: autoRenewStatus ? 'AUTO_RENEWING' : 'CANCELLED',
      receiptData: normalizedReceipt,
      rawPayload: response as unknown as Record<string, unknown>,
    };
  }

  getConfiguredProductId(): string {
    const productId = this.configService.get<string>('MOBILE_IOS_PREMIUM_PRODUCT_ID')?.trim();
    if (!productId) {
      throw new BadRequestException({
        code: 'APPLE_PRODUCT_NOT_CONFIGURED',
        message: 'MOBILE_IOS_PREMIUM_PRODUCT_ID is not configured',
      });
    }
    return productId;
  }

  private selectLatestReceiptInfo(
    entries: AppleReceiptInfo[],
    expectedProductId: string,
  ): AppleReceiptInfo | null {
    const matching = entries.filter((entry) => entry.product_id === expectedProductId);
    if (matching.length === 0) {
      return null;
    }

    return matching.sort(
      (a, b) => Number(b.expires_date_ms ?? 0) - Number(a.expires_date_ms ?? 0),
    )[0];
  }

  private async postReceipt(
    receiptData: string,
    sharedSecret: string,
    sandbox: boolean,
  ): Promise<AppleVerifyResponse> {
    const url = sandbox ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        password: sharedSecret,
        'exclude-old-transactions': true,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException({
        code: 'APPLE_VERIFICATION_FAILED',
        message: 'Apple receipt verification service unavailable',
      });
    }

    return (await response.json()) as AppleVerifyResponse;
  }
}

export function mapApplePlatform(): MobilePlatform {
  return MobilePlatform.IOS;
}

export function mapAppleProvider(): StoreProvider {
  return StoreProvider.APPLE;
}
