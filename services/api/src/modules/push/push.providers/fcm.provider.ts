import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type Messaging } from 'firebase-admin/messaging';
import {
  PushDeliveryAttempt,
  PushDeliveryResult,
  PushMessage,
  PushProvider,
} from './push-provider.interface';

@Injectable()
export class FcmProvider implements PushProvider {
  readonly providerName = 'FCM' as const;
  private readonly logger = new Logger(FcmProvider.name);
  private app?: App;
  private messaging?: Messaging;

  constructor(private readonly configService: ConfigService) {}

  async sendToTokens(tokens: string[], message: PushMessage): Promise<PushDeliveryResult> {
    const cleanTokens = tokens.map((token) => token.trim()).filter(Boolean);
    if (cleanTokens.length === 0) {
      return { provider: this.providerName, attempts: [] };
    }

    const response = await this.getMessagingClient().sendEachForMulticast({
      tokens: cleanTokens,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: {
        ...(message.data ?? {}),
        category: message.category,
        dedupeKey: message.dedupeKey,
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });

    const attempts = this.mapBatchResponse(cleanTokens, response);

    this.logger.log(`FCM send processed: tokens=${tokens.length} success=${response.successCount} failure=${response.failureCount}`);

    return {
      provider: this.providerName,
      attempts,
    };
  }

  private getMessagingClient(): Messaging {
    if (!this.messaging) {
      this.app = this.initializeFirebaseApp();
      this.messaging = getMessaging(this.app);
    }

    return this.messaging;
  }

  private initializeFirebaseApp(): App {
    if (getApps().length > 0) {
      return getApp();
    }

    const serviceAccount = this.loadServiceAccount();
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  private loadServiceAccount() {
    const json = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (json?.trim()) {
      let parsed: {
        project_id?: string;
        projectId?: string;
        client_email?: string;
        clientEmail?: string;
        private_key?: string;
        privateKey?: string;
      };
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new ServiceUnavailableException('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
      }

      const serviceAccount = {
        projectId: parsed.project_id ?? parsed.projectId,
        clientEmail: parsed.client_email ?? parsed.clientEmail,
        privateKey: this.normalizePrivateKey(parsed.private_key ?? parsed.privateKey),
      };
      return this.assertServiceAccount(serviceAccount);
    }

    const projectId = this.configService.get<string>('FCM_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');
    const privateKey = this.normalizePrivateKey(this.configService.get<string>('FCM_PRIVATE_KEY'));

    if (!projectId || !clientEmail || !privateKey) {
      throw new ServiceUnavailableException(
        'Firebase Admin credentials are required: set FIREBASE_SERVICE_ACCOUNT_JSON or FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY',
      );
    }

    return this.assertServiceAccount({ projectId, clientEmail, privateKey });
  }

  private normalizePrivateKey(value: string | undefined) {
    if (!value?.trim()) return undefined;
    return value.replace(/\\n/g, '\n');
  }

  private assertServiceAccount(value: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  }) {
    if (!value.projectId || !value.clientEmail || !value.privateKey) {
      throw new ServiceUnavailableException('Firebase Admin service account is missing projectId, clientEmail, or privateKey');
    }

    return {
      projectId: value.projectId,
      clientEmail: value.clientEmail,
      privateKey: value.privateKey,
    };
  }

  private mapBatchResponse(tokens: string[], response: BatchResponse): PushDeliveryAttempt[] {
    return response.responses.map((item, index) => {
      const token = tokens[index];
      if (item.success) {
        return {
          token,
          success: true,
          retryable: false,
          providerMessageId: item.messageId,
        };
      }

      const code = item.error?.code ?? 'messaging/unknown-error';
      return {
        token,
        success: false,
        retryable: this.isRetryableError(code),
        errorCode: code,
        errorMessage: item.error?.message ?? code,
      };
    });
  }

  private isRetryableError(code: string) {
    return [
      'messaging/internal-error',
      'messaging/server-unavailable',
      'messaging/unknown-error',
      'messaging/quota-exceeded',
      'app/network-error',
    ].includes(code);
  }
}
