import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  classifyEmailDeliveryError,
  formatEmailErrorLog,
} from '../email-error.util';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
  EmailProviderName,
} from '../email.provider.interface';
import { resolveEmailConfig } from '../email-config.util';
import { resolveEmailRetryOptions } from '../email-retry.util';
import { SmtpTransportService } from '../smtp-transport.service';

@Injectable()
export abstract class BaseSmtpEmailProvider implements EmailProvider {
  abstract readonly providerName: EmailProviderName;
  abstract readonly displayName: string;

  protected readonly logger = new Logger(BaseSmtpEmailProvider.name);

  constructor(
    protected readonly configService: ConfigService,
    protected readonly smtpTransportService: SmtpTransportService,
  ) {}

  async verifyConnection(): Promise<void> {
    await this.smtpTransportService.verifyConnection();
  }

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    const transporter = this.smtpTransportService.getTransporter();
    if (!transporter) {
      throw new Error(`${this.displayName} provider selected but SMTP transport is incomplete`);
    }

    const config = resolveEmailConfig(this.readEnv());
    const retryOptions = resolveEmailRetryOptions({
      SMTP_MAX_RETRIES: this.configService.get<string>('SMTP_MAX_RETRIES'),
      SMTP_RETRY_DELAY_MS: this.configService.get<string>('SMTP_RETRY_DELAY_MS'),
    });

    const attempts = [];

    for (const message of messages) {
      let lastError: unknown;
      let success = false;
      let providerMessageId: string | undefined;

      for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt += 1) {
        try {
          const info = await transporter.sendMail({
            from: config.from,
            to: message.to,
            subject: message.subject,
            text: message.body,
            html: message.html ?? undefined,
          });
          success = true;
          providerMessageId = info.messageId;
          break;
        } catch (error) {
          lastError = error;
          const classified = classifyEmailDeliveryError(error);
          this.logger.error(
            formatEmailErrorLog({
              provider: this.providerName,
              to: message.to,
              category: classified.category,
              message: classified.message,
              attempt,
              maxAttempts: retryOptions.maxAttempts,
            }),
          );

          if (!classified.retryable || attempt >= retryOptions.maxAttempts) {
            break;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, retryOptions.baseDelayMs * attempt),
          );
        }
      }

      if (success) {
        attempts.push({
          to: message.to,
          success: true,
          providerMessageId,
          retryable: false,
        });
        continue;
      }

      const classified = classifyEmailDeliveryError(lastError, {
        retryExhausted: retryOptions.maxAttempts > 1,
      });

      attempts.push({
        to: message.to,
        success: false,
        errorCode: classified.category,
        errorMessage: classified.message,
        retryable: classified.retryable,
      });
    }

    return {
      provider: this.providerName,
      attempts,
    };
  }

  protected readEnv(): Record<string, string | undefined> {
    return {
      EMAIL_PROVIDER: this.configService.get<string>('EMAIL_PROVIDER'),
      SMTP_HOST: this.configService.get<string>('SMTP_HOST'),
      SMTP_PORT: this.configService.get<string>('SMTP_PORT'),
      SMTP_SECURE: this.configService.get<string>('SMTP_SECURE'),
      SMTP_USERNAME: this.configService.get<string>('SMTP_USERNAME'),
      SMTP_PASSWORD: this.configService.get<string>('SMTP_PASSWORD'),
      SMTP_USER: this.configService.get<string>('SMTP_USER'),
      SMTP_PASS: this.configService.get<string>('SMTP_PASS'),
      SMTP_FROM_EMAIL: this.configService.get<string>('SMTP_FROM_EMAIL'),
      SMTP_FROM_NAME: this.configService.get<string>('SMTP_FROM_NAME'),
      SMTP_FROM: this.configService.get<string>('SMTP_FROM'),
      APP_NAME: this.configService.get<string>('APP_NAME'),
      SMTP_MAX_RETRIES: this.configService.get<string>('SMTP_MAX_RETRIES'),
      SMTP_RETRY_DELAY_MS: this.configService.get<string>('SMTP_RETRY_DELAY_MS'),
    };
  }
}
