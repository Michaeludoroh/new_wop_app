import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type Messaging } from 'firebase-admin/messaging';
import {
  FirebaseAdminCredentialsError,
  resolveFirebaseAdminCredentials,
  type ResolvedFirebaseCredentials,
} from './firebase-admin-credentials.loader';
import {
  PushDeliveryAttempt,
  PushDeliveryResult,
  PushMessage,
  PushProvider,
} from './push-provider.interface';

@Injectable()
export class FcmProvider implements PushProvider, OnModuleInit {
  readonly providerName = 'FCM' as const;
  private readonly logger = new Logger(FcmProvider.name);
  private app?: App;
  private messaging?: Messaging;
  private resolvedCredentials?: ResolvedFirebaseCredentials;
  private startupLogged = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      this.initializeFirebaseApp();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        this.logger.warn(`Firebase Admin not configured: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  async sendToTokens(tokens: string[], message: PushMessage): Promise<PushDeliveryResult> {
    const cleanTokens = tokens.map((token) => token.trim()).filter(Boolean);
    if (cleanTokens.length === 0) {
      return { provider: this.providerName, attempts: [] };
    }

    this.logger.log(
      `FCM payload generated dedupeKey=${message.dedupeKey} tokenCount=${cleanTokens.length} title="${message.title}" dataKeys=${Object.keys(message.data ?? {}).join(',') || 'none'}`,
    );

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

    this.logger.log(
      `FCM response received dedupeKey=${message.dedupeKey} success=${response.successCount} failure=${response.failureCount}`,
    );

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

    const resolved = this.resolveCredentials();
    if (!this.startupLogged) {
      this.logger.log(resolved.startupLogMessage);
      this.startupLogged = true;
    }

    return initializeApp({
      credential: cert(resolved.credentials),
      projectId: resolved.credentials.projectId,
    });
  }

  private resolveCredentials(): ResolvedFirebaseCredentials {
    if (this.resolvedCredentials) {
      return this.resolvedCredentials;
    }

    try {
      this.resolvedCredentials = resolveFirebaseAdminCredentials({
        serviceAccountJson: this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON'),
        serviceAccountFile: this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_FILE'),
        projectId: this.configService.get<string>('FCM_PROJECT_ID'),
        clientEmail: this.configService.get<string>('FCM_CLIENT_EMAIL'),
        privateKey: this.configService.get<string>('FCM_PRIVATE_KEY'),
      });
      return this.resolvedCredentials;
    } catch (error) {
      if (error instanceof FirebaseAdminCredentialsError) {
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }
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
