import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentWebhookDto } from '../dto/payment-webhook.dto';
import { PaymentProviderAdapter } from './payment-provider.interface';
import {
  CheckoutSessionRequest,
  CheckoutSessionResult,
  NormalizedProviderEvent,
  VerificationResult,
} from './payment-provider.types';

@Injectable()
export class PaystackProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.PAYSTACK;

  async createCheckoutSession(_request: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    throw new NotImplementedException('Paystack checkout is not enabled for this milestone');
  }

  async verifySignature(dto: PaymentWebhookDto): Promise<VerificationResult> {
    if (!dto.signature || dto.signature.trim().length < 8) {
      return { isValid: false, reason: 'Invalid Paystack signature' };
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
        amount: payload['amount'] ?? null,
        currency: payload['currency'] ?? null,
        customerEmail: payload['customer'] ?? payload['email'] ?? null,
        failureCode,
        failureMessage,
      },
    };
  }

  private mapEventType(eventType: string): PaymentStatus {
    const normalized = eventType.toLowerCase();
    if (normalized.includes('success') || normalized.includes('charge.success')) {
      return PaymentStatus.SUCCESS;
    }
    if (normalized.includes('failed') || normalized.includes('fail')) {
      return PaymentStatus.FAILED;
    }
    return PaymentStatus.PENDING;
  }

  private extractFailureCode(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureCode'] ??
      payload['errorCode'] ??
      payload['gateway_response'] ??
      payload['code'] ??
      eventType;
    return String(raw).trim().slice(0, 100) || 'PAYMENT_FAILED';
  }

  private extractFailureMessage(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureMessage'] ??
      payload['errorMessage'] ??
      payload['message'] ??
      payload['gateway_response'] ??
      `Paystack event indicates failure: ${eventType}`;
    return String(raw).trim().slice(0, 500);
  }
}
