import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { MobilePlatform, StoreProvider } from '@prisma/client';

export type GoogleSubscriptionVerification = {
  productId: string;
  purchaseToken: string;
  transactionId: string;
  purchaseDate: Date;
  expiryDate: Date;
  autoRenewStatus: boolean;
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  renewalStatus: string;
  acknowledged: boolean;
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class GooglePlayVerificationService {
  private readonly logger = new Logger(GooglePlayVerificationService.name);
  private authClient: GoogleAuth | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifySubscriptionPurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<GoogleSubscriptionVerification> {
    const packageName = this.getPackageName();
    const accessToken = await this.getAccessToken();

    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
      `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `Google Play verification failed for product ${productId}: ${response.status} ${JSON.stringify(payload)}`,
      );
      throw new UnauthorizedException({
        code: 'GOOGLE_VERIFICATION_FAILED',
        message: 'Unable to verify Google Play purchase token',
      });
    }

    const expiryMillis = Number(payload.expiryTimeMillis ?? 0);
    const startMillis = Number(payload.startTimeMillis ?? payload.purchaseTimeMillis ?? Date.now());
    const expiryDate = new Date(expiryMillis);
    const purchaseDate = new Date(startMillis);
    const autoRenewStatus = payload.autoRenewing === true;
    const paymentState = Number(payload.paymentState ?? 1);
    const cancelReason = payload.cancelReason;
    const now = Date.now();

    let status: GoogleSubscriptionVerification['status'] = 'ACTIVE';
    if (expiryMillis <= now) {
      status = 'EXPIRED';
    } else if (paymentState === 0) {
      status = 'GRACE';
    } else if (cancelReason != null && !autoRenewStatus) {
      status = 'ACTIVE';
    }

    const orderId = String(payload.orderId ?? purchaseToken);
    const acknowledged = payload.acknowledgementState === 1;

    return {
      productId,
      purchaseToken,
      transactionId: orderId,
      purchaseDate,
      expiryDate,
      autoRenewStatus,
      status,
      renewalStatus: autoRenewStatus ? 'AUTO_RENEWING' : 'CANCELLED',
      acknowledged,
      rawPayload: payload,
    };
  }

  async acknowledgeSubscriptionPurchase(productId: string, purchaseToken: string): Promise<void> {
    const packageName = this.getPackageName();
    const accessToken = await this.getAccessToken();

    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
      `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const payload = await response.text();
      this.logger.warn(`Google Play acknowledgement failed: ${response.status} ${payload}`);
      throw new BadRequestException({
        code: 'GOOGLE_ACKNOWLEDGEMENT_FAILED',
        message: 'Unable to acknowledge Google Play purchase',
      });
    }
  }

  getConfiguredProductId(): string {
    const productId = this.configService.get<string>('MOBILE_ANDROID_PREMIUM_PRODUCT_ID')?.trim();
    if (!productId) {
      throw new BadRequestException({
        code: 'GOOGLE_PRODUCT_NOT_CONFIGURED',
        message: 'MOBILE_ANDROID_PREMIUM_PRODUCT_ID is not configured',
      });
    }
    return productId;
  }

  private getPackageName(): string {
    const packageName = this.configService.get<string>('GOOGLE_PLAY_PACKAGE_NAME')?.trim();
    if (!packageName) {
      throw new BadRequestException({
        code: 'GOOGLE_PACKAGE_NOT_CONFIGURED',
        message: 'GOOGLE_PLAY_PACKAGE_NAME is not configured',
      });
    }
    return packageName;
  }

  private async getAccessToken(): Promise<string> {
    const credentials = this.resolveServiceAccountCredentials();
    if (!credentials) {
      throw new BadRequestException({
        code: 'GOOGLE_CREDENTIALS_NOT_CONFIGURED',
        message: 'Google Play service account credentials are not configured',
      });
    }

    if (!this.authClient) {
      this.authClient = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    }

    const client = await this.authClient.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
      throw new ForbiddenException({
        code: 'GOOGLE_AUTH_FAILED',
        message: 'Unable to obtain Google Play API access token',
      });
    }

    return token;
  }

  private resolveServiceAccountCredentials(): Record<string, unknown> | null {
    const inlineJson = this.configService.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')?.trim();
    if (inlineJson) {
      try {
        return JSON.parse(inlineJson) as Record<string, unknown>;
      } catch {
        throw new BadRequestException({
          code: 'GOOGLE_CREDENTIALS_INVALID',
          message: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON',
        });
      }
    }

    return null;
  }
}

export function mapGooglePlatform(): MobilePlatform {
  return MobilePlatform.ANDROID;
}

export function mapGoogleProvider(): StoreProvider {
  return StoreProvider.GOOGLE_PLAY;
}
