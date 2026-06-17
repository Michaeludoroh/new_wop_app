import { PaymentProvider, PaymentStatus } from '@prisma/client';

export type CheckoutCustomer = {
  email: string;
  name: string;
};

export type CheckoutSessionRequest = {
  txRef: string;
  amount: string;
  currency: string;
  redirectUrl: string;
  customer: CheckoutCustomer;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
};

export type CheckoutSessionResult = {
  checkoutUrl: string;
  providerReference: string;
  rawPayload: Record<string, unknown>;
};

export type VerificationResult = {
  isValid: boolean;
  reason?: string;
};

export type NormalizedProviderEvent = {
  provider: PaymentProvider;
  externalEventId: string;
  eventType: string;
  providerReference?: string;
  mappedStatus: PaymentStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  retryable?: boolean;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
};

export type TransactionVerificationResult = {
  verified: boolean;
  mappedStatus: PaymentStatus;
  providerReference: string;
  normalizedPayload: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type TokenizedChargeRequest = {
  txRef: string;
  amount: string;
  currency: string;
  email: string;
  token: string;
  metadata?: Record<string, unknown>;
};

export type TokenizedChargeResult = {
  success: boolean;
  providerReference: string;
  mappedStatus: PaymentStatus;
  normalizedPayload: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  failureCode?: string | null;
  failureMessage?: string | null;
};
