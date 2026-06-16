export type PushAudience =
  | { mode: 'single'; userId: string }
  | { mode: 'multi'; userIds: string[] }
  | { mode: 'broadcast' };

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
  category: 'NOTIFICATION' | 'PAYMENT' | 'SUBSCRIPTION' | 'SECURITY' | 'SYSTEM';
  dedupeKey: string;
};

export type PushDeliveryAttempt = {
  token: string;
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
};

export type PushDeliveryResult = {
  provider: 'FCM';
  attempts: PushDeliveryAttempt[];
};

export interface PushProvider {
  readonly providerName: 'FCM';
  sendToTokens(tokens: string[], message: PushMessage): Promise<PushDeliveryResult>;
}
