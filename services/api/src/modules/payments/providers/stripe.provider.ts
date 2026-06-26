import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { PaymentProviderAdapter } from './payment-provider.interface';
import {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  NormalizedProviderEvent,
  TokenizedChargeRequest,
  TokenizedChargeResult,
  TransactionVerificationResult,
  VerificationResult,
} from './payment-provider.types';

@Injectable()
export class StripeProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.STRIPE;

  async createCheckoutSession(_request: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    throw new NotImplementedException('Stripe checkout is not enabled for this milestone');
  }

  async verifySignature(dto: PaymentWebhookDto): Promise<VerificationResult> {
    if (!dto.signature || dto.signature.trim().length < 8) {
      return { isValid: false, reason: 'Invalid Stripe signature' };
    }
    return { isValid: true };
  }

  async normalizeEvent(dto: PaymentWebhookDto): Promise<NormalizedProviderEvent> {
    const mappedStatus = this.mapEventType(dto.eventType);
    const payload = dto.payload ?? {};
    const failureCode =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureCode(payload, dto.eventType) : null;
    const failureMessage =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureMessage(payload, dto.eventType) : null;
    const retryable = mappedStatus === PaymentStatus.FAILED;

    return {
      provider: this.provider,
      externalEventId: dto.eventId,
      eventType: dto.eventType,
      providerReference: dto.providerReference,
      mappedStatus,
      failureCode,
      failureMessage,
      retryable,
      rawPayload: payload,
      normalizedPayload: {
        provider: this.provider,
        eventType: dto.eventType,
        eventId: dto.eventId,
        status: mappedStatus,
        amount: payload['amount_total'] ?? payload['amount'] ?? null,
        currency: payload['currency'] ?? null,
        customerEmail: payload['customer_email'] ?? payload['email'] ?? null,
        failureCode,
        failureMessage,
      },
    };
  }

  async verifyTransactionByReference(txRef: string): Promise<TransactionVerificationResult> {
    return {
      isVerified: false,
      mappedStatus: PaymentStatus.PENDING,
      providerReference: txRef,
      normalizedPayload: {
        provider: this.provider,
        error: 'STRIPE_NOT_ENABLED',
        message: 'Stripe transaction verification is not enabled',
      },
      failureMessage: 'Stripe transaction verification is not enabled for this deployment',
    };
  }

  async chargeTokenizedPayment(_request: TokenizedChargeRequest): Promise<TokenizedChargeResult> {
    throw new NotImplementedException('Stripe tokenized charges are not enabled for this milestone');
  }

  private mapEventType(eventType: string): PaymentStatus {
    const normalized = eventType.toLowerCase();
    if (normalized.includes('succeeded') || normalized.includes('success')) {
      return PaymentStatus.SUCCESS;
    }
    if (normalized.includes('failed') || normalized.includes('fail')) {
      return PaymentStatus.FAILED;
    }
    if (normalized.includes('processing')) {
      return PaymentStatus.PENDING;
    }
    return PaymentStatus.PENDING;
  }

  private extractFailureCode(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureCode'] ??
      payload['errorCode'] ??
      payload['decline_code'] ??
      payload['code'] ??
      eventType;
    return String(raw).trim().slice(0, 100) || 'PAYMENT_FAILED';
  }

  private extractFailureMessage(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureMessage'] ??
      payload['errorMessage'] ??
      payload['message'] ??
      payload['failure_message'] ??
      `Stripe event indicates failure: ${eventType}`;
    return String(raw).trim().slice(0, 500);
  }
}
