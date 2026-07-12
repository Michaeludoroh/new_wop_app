import type { EmailProviderId } from './email-config.util';

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
  html?: string;
  dedupeKey: string;
  metadata?: Record<string, string>;
};

export type EmailDeliveryAttempt = {
  to: string;
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
};

export type EmailProviderName = EmailProviderId;

export type EmailDeliveryResult = {
  provider: EmailProviderName;
  attempts: EmailDeliveryAttempt[];
};

export interface EmailProvider {
  readonly providerName: EmailProviderName;
  readonly displayName: string;
  send(messages: EmailMessage[]): Promise<EmailDeliveryResult>;
  verifyConnection?(): Promise<void>;
}

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER';
