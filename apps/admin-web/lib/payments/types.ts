export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export type PaymentTransaction = {
  id: string;
  userId: string;
  provider: string;
  providerReference: string;
  transactionType: string;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  initiatedAt: string;
  paidAt?: string | null;
  failedAt?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  retryable: boolean;
  retryCount: number;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentHistoryResponse = {
  data: PaymentTransaction[];
};

export type WebhookProcessingStatus = "RECEIVED" | "PROCESSED" | "FAILED" | "DUPLICATE";

export type PaymentWebhookEvent = {
  id: string;
  provider: string;
  externalEventId: string;
  eventType: string;
  paymentTransactionId?: string | null;
  receivedAt: string;
  processedAt?: string | null;
  processingStatus: WebhookProcessingStatus;
  signatureValid: boolean;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEventsResponse = {
  data: PaymentWebhookEvent[];
};
