import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
} from './email.provider.interface';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly providerName = 'SMTP' as const;
  private readonly logger = new Logger(SmtpEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

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
