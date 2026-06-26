import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
} from './email.provider.interface';
import { buildNodemailerTransportOptions } from './smtp-config.util';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly providerName = 'SMTP' as const;
  private readonly logger = new Logger(SmtpEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    const transportOptions = buildNodemailerTransportOptions({
      SMTP_HOST: this.configService.get<string>('SMTP_HOST'),
      SMTP_PORT: this.configService.get<string>('SMTP_PORT'),
      SMTP_SECURE: this.configService.get<string>('SMTP_SECURE'),
      SMTP_USER: this.configService.get<string>('SMTP_USER'),
      SMTP_PASS: this.configService.get<string>('SMTP_PASS'),
    });

    if (!transportOptions) {
      throw new Error('SMTP provider selected but transport options are incomplete');
    }

    const transporter = nodemailer.createTransport(transportOptions);

    const from =
      this.configService.get<string>('SMTP_FROM') ??
      'WOP Platform <no-reply@wop.local>';

    const attempts = [];
    for (const message of messages) {
      try {
        const info = await transporter.sendMail({
          from,
          to: message.to,
          subject: message.subject,
          text: message.body,
          html: message.html ?? undefined,
        });
        attempts.push({
          to: message.to,
          success: true,
          providerMessageId: info.messageId,
          retryable: false,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown SMTP error';
        this.logger.error(`SMTP delivery failed for ${message.to}: ${errorMessage}`);
        attempts.push({
          to: message.to,
          success: false,
          errorMessage,
          retryable: true,
        });
      }
    }

    return { provider: 'SMTP', attempts };
  }
}
