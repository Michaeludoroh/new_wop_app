import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MobilePlatform, StoreProvider } from '@prisma/client';
import { verify, X509Certificate } from 'crypto';

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const DEFAULT_APPLE_BUNDLE_ID = 'com.ministrymobile.app';

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
  environment?: string;
  latest_receipt_info?: AppleReceiptInfo[];
  pending_renewal_info?: Array<{
    auto_renew_status?: string;
    product_id?: string;
    expiration_intent?: string;
  }>;
  receipt?: {
    bundle_id?: string;
    in_app?: AppleReceiptInfo[];
  };
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

    if (looksLikeAppleJws(normalizedReceipt)) {
      this.logger.log('Apple payload kind=storekit2_jws');
      return this.verifySignedTransaction(normalizedReceipt);
    }

    const sharedSecret = this.configService.get<string>('APPLE_SHARED_SECRET')?.trim();
    const secretConfigured = Boolean(sharedSecret);
    this.logger.log(`Apple shared secret configured=${secretConfigured}`);
    if (!sharedSecret) {
      throw new BadRequestException({
        code: 'APPLE_SHARED_SECRET_NOT_CONFIGURED',
        message: 'APPLE_SHARED_SECRET is not configured',
      });
    }

    const response = await this.verifyReceiptWithApple(normalizedReceipt, sharedSecret);
    if (response.status !== 0) {
      this.logger.warn(
        `Apple receipt verification failed status=${response.status} environment=${response.environment ?? 'unknown'}`,
      );
      throw new UnauthorizedException({
        code: 'APPLE_VERIFICATION_FAILED',
        message: `Apple receipt verification failed (status ${response.status})`,
      });
    }

    this.logger.log(
      `Apple verifyReceipt succeeded status=0 environment=${response.environment ?? 'unknown'}`,
    );

    const expectedProductId = this.getConfiguredProductId();
    const latest = this.selectLatestReceiptInfo(collectReceiptInfo(response), expectedProductId);

    if (!latest) {
      throw new UnauthorizedException({
        code: 'APPLE_SUBSCRIPTION_NOT_FOUND',
        message: 'No active Apple subscription found in receipt',
      });
    }

    return this.mapReceiptInfo(
      latest,
      expectedProductId,
      response.pending_renewal_info ?? [],
      normalizedReceipt,
      response as unknown as Record<string, unknown>,
    );
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

  private async verifyReceiptWithApple(
    receiptData: string,
    sharedSecret: string,
  ): Promise<AppleVerifyResponse> {
    // Apple: always try production first, then follow 21007/21008 to the other environment.
    let response = await this.postReceipt(receiptData, sharedSecret, false);
    this.logger.log(
      `Apple verifyReceipt status=${response.status} environment=${response.environment ?? 'production'}`,
    );

    if (response.status === 21007) {
      response = await this.postReceipt(receiptData, sharedSecret, true);
      this.logger.log(
        `Apple verifyReceipt retry status=${response.status} environment=${response.environment ?? 'sandbox'}`,
      );
    }

    if (response.status === 21008) {
      response = await this.postReceipt(receiptData, sharedSecret, false);
      this.logger.log(
        `Apple verifyReceipt retry status=${response.status} environment=${response.environment ?? 'production'}`,
      );
    }

    return response;
  }

  private verifySignedTransaction(jws: string): AppleSubscriptionVerification {
    const payload = verifyAppleJwsPayload(jws);
    const expectedProductId = this.getConfiguredProductId();
    const expectedBundleId = this.getConfiguredBundleId();
    const bundleId = stringValue(payload.bundleId);
    const productId = stringValue(payload.productId);
    const environment = stringValue(payload.environment) ?? 'unknown';

    this.logger.log(
      `Apple JWS verified environment=${environment} productId=${productId ?? 'missing'} bundleId=${bundleId ?? 'missing'}`,
    );

    if (bundleId && bundleId !== expectedBundleId) {
      throw new UnauthorizedException({
        code: 'APPLE_BUNDLE_MISMATCH',
        message: 'Apple transaction bundle ID does not match this app',
      });
    }

    if (productId && productId !== expectedProductId) {
      throw new UnauthorizedException({
        code: 'INVALID_PRODUCT_ID',
        message: 'Unexpected Apple product identifier',
      });
    }

    const purchaseMillis = numberValue(payload.purchaseDate) ?? Date.now();
    const expiryMillis = numberValue(payload.expiresDate) ?? 0;
    const now = Date.now();
    let status: AppleSubscriptionVerification['status'] = 'ACTIVE';
    if (expiryMillis <= now) {
      status = 'EXPIRED';
    }

    const transactionId = stringValue(payload.transactionId) ?? '';
    const originalTransactionId =
      stringValue(payload.originalTransactionId) ?? transactionId;

    return {
      productId: productId ?? expectedProductId,
      transactionId,
      originalTransactionId,
      purchaseDate: new Date(purchaseMillis),
      expiryDate: new Date(expiryMillis),
      autoRenewStatus: true,
      status,
      renewalStatus: 'AUTO_RENEWING',
      receiptData: jws,
      rawPayload: {
        environment,
        verification: 'storekit2_jws',
        productId,
        transactionId,
        originalTransactionId,
        expiresDate: expiryMillis,
      },
    };
  }

  private getConfiguredBundleId(): string {
    return (
      this.configService.get<string>('APPLE_BUNDLE_ID')?.trim() ||
      this.configService.get<string>('GOOGLE_PLAY_PACKAGE_NAME')?.trim() ||
      DEFAULT_APPLE_BUNDLE_ID
    );
  }

  private mapReceiptInfo(
    latest: AppleReceiptInfo,
    expectedProductId: string,
    pendingRenewalInfo: Array<{ auto_renew_status?: string; product_id?: string }>,
    receiptData: string,
    rawPayload: Record<string, unknown>,
  ): AppleSubscriptionVerification {
    const expiryMillis = Number(latest.expires_date_ms ?? 0);
    const purchaseMillis = Number(latest.purchase_date_ms ?? Date.now());
    const expiryDate = new Date(expiryMillis);
    const purchaseDate = new Date(purchaseMillis);
    const now = Date.now();

    const renewalInfo = pendingRenewalInfo.find((item) => item.product_id === latest.product_id);
    const autoRenewStatus = renewalInfo?.auto_renew_status === '1';

    let status: AppleSubscriptionVerification['status'] = 'ACTIVE';
    if (expiryMillis <= now) {
      status = 'EXPIRED';
    } else if (latest.is_in_billing_retry_period === '1') {
      status = 'GRACE';
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
      receiptData,
      rawPayload,
    };
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
      this.logger.warn(
        `Apple verifyReceipt HTTP ${response.status} environment=${sandbox ? 'sandbox' : 'production'}`,
      );
      throw new UnauthorizedException({
        code: 'APPLE_VERIFICATION_FAILED',
        message: 'Apple receipt verification service unavailable',
      });
    }

    return (await response.json()) as AppleVerifyResponse;
  }
}

export function looksLikeAppleJws(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('eyJ')) {
    return false;
  }
  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function verifyAppleJwsPayload(jws: string): Record<string, unknown> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  let header: { alg?: string; x5c?: string[] };
  try {
    header = JSON.parse(base64UrlToBuffer(headerPart).toString('utf8')) as {
      alg?: string;
      x5c?: string[];
    };
  } catch {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  if (header.alg !== 'ES256' || !header.x5c?.[0]) {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  let leaf: X509Certificate;
  try {
    leaf = new X509Certificate(Buffer.from(header.x5c[0], 'base64'));
  } catch {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  if (!leaf.issuer.includes('Apple') && !leaf.subject.includes('Apple')) {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  const signature = base64UrlToBuffer(signaturePart);
  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  const valid = verify('sha256', signed, { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  if (!valid) {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }

  try {
    return JSON.parse(base64UrlToBuffer(payloadPart).toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new UnauthorizedException({
      code: 'APPLE_JWS_INVALID',
      message: 'Apple transaction signature is invalid',
    });
  }
}

function collectReceiptInfo(response: AppleVerifyResponse): AppleReceiptInfo[] {
  const latest = response.latest_receipt_info ?? [];
  if (latest.length > 0) {
    return latest;
  }
  return response.receipt?.in_app ?? [];
}

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(padded + pad, 'base64');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function mapApplePlatform(): MobilePlatform {
  return MobilePlatform.IOS;
}

export function mapAppleProvider(): StoreProvider {
  return StoreProvider.APPLE;
}
