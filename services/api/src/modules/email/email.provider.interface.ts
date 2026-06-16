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

export type EmailProviderName = 'MOCK_SMTP' | 'SMTP';

export type EmailDeliveryResult = {
  provider: EmailProviderName;
  attempts: EmailDeliveryAttempt[];
};

export interface EmailProvider {
  readonly providerName: EmailProviderName;
  send(messages: EmailMessage[]): Promise<EmailDeliveryResult>;
}
