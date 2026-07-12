import { Injectable, Logger } from '@nestjs/common';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
} from '../email.provider.interface';

@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly providerName = 'mock' as const;
  readonly displayName = 'Mock';
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    const attempts = messages.map((message) => {
      const providerMessageId = `mock:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

      this.logger.log(
        JSON.stringify({
          event: 'email_delivery_attempt',
          provider: this.providerName,
          to: message.to,
          dedupeKey: message.dedupeKey,
          subject: message.subject,
          providerMessageId,
          success: true,
        }),
      );

      return {
        to: message.to,
        success: true,
        providerMessageId,
        retryable: false,
      };
    });

    return {
      provider: this.providerName,
      attempts,
    };
  }
}
