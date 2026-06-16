import { Inject, Injectable } from '@nestjs/common';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
} from './email.provider.interface';

@Injectable()
export class EmailService {
  constructor(
    @Inject('EMAIL_PROVIDER') private readonly provider: EmailProvider,
  ) {}

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    if (messages.length === 0) {
      return { provider: 'MOCK_SMTP', attempts: [] };
    }
    return this.provider.send(messages);
  }
}
