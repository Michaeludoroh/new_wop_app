import { Inject, Injectable } from '@nestjs/common';
import {
  EmailDeliveryResult,
  EmailMessage,
  EmailProvider,
  EMAIL_PROVIDER_TOKEN,
} from './email.provider.interface';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly provider: EmailProvider,
  ) {}

  getActiveProviderName() {
    return this.provider.providerName;
  }

  async send(messages: EmailMessage[]): Promise<EmailDeliveryResult> {
    if (messages.length === 0) {
      return { provider: this.provider.providerName, attempts: [] };
    }
    return this.provider.send(messages);
  }
}
