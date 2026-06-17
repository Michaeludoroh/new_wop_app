import { PaymentProvider } from '@prisma/client';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  NormalizedProviderEvent,
  TokenizedChargeRequest,
  TokenizedChargeResult,
  TransactionVerificationResult,
  VerificationResult,
} from './payment-provider.types';

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
  verifySignature(dto: PaymentWebhookDto): Promise<VerificationResult>;
  normalizeEvent(dto: PaymentWebhookDto): Promise<NormalizedProviderEvent>;
  verifyTransactionByReference(txRef: string): Promise<TransactionVerificationResult>;
  chargeTokenizedPayment(request: TokenizedChargeRequest): Promise<TokenizedChargeResult>;
}
