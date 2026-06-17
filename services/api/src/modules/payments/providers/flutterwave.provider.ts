import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class FlutterwaveProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.FLUTTERWAVE;

  constructor(private readonly configService: ConfigService) {}

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    const secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
    if (!secretKey) {
      throw new BadGatewayException({
        code: 'FLUTTERWAVE_NOT_CONFIGURED',
        message: 'Flutterwave secret key is not configured',
      });
    }

    const payload = {
      tx_ref: request.txRef,
      amount: request.amount,
      currency: request.currency,
      redirect_url: request.redirectUrl,
      customer: {
        email: request.customer.email,
        name: request.customer.name,
      },
      customizations: {
        title: request.title,
        description: request.description,
      },
      meta: request.metadata,
    };

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok || responseBody['status'] !== 'success') {
      throw new BadGatewayException({
        code: 'FLUTTERWAVE_CHECKOUT_FAILED',
        message: 'Flutterwave checkout initialization failed',
        providerStatus: response.status,
        providerResponse: responseBody,
      });
    }

    const data = this.asRecord(responseBody['data']);
    const checkoutUrl = typeof data['link'] === 'string' ? data['link'] : null;

    if (!checkoutUrl) {
      throw new BadGatewayException({
        code: 'FLUTTERWAVE_CHECKOUT_URL_MISSING',
        message: 'Flutterwave checkout response did not include a payment link',
      });
    }

    return {
      checkoutUrl,
      providerReference: request.txRef,
      rawPayload: responseBody,
    };
  }

  async verifySignature(dto: PaymentWebhookDto): Promise<VerificationResult> {
    const webhookSecret = this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return { isValid: false, reason: 'Flutterwave webhook secret is not configured' };
    }

    if (dto.signature !== webhookSecret) {
      return { isValid: false, reason: 'Invalid Flutterwave webhook signature' };
    }

    return { isValid: true };
  }

  async normalizeEvent(dto: PaymentWebhookDto): Promise<NormalizedProviderEvent> {
    const payload = dto.payload ?? {};
    const data = this.asRecord(payload['data']);
    const status = String(data['status'] ?? payload['status'] ?? dto.eventType);
    const mappedStatus = this.mapStatus(status);
    const providerReference =
      dto.providerReference ??
      this.stringFrom(data['tx_ref']) ??
      this.stringFrom(payload['tx_ref']) ??
      this.stringFrom(data['txRef']);
    const failureCode =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureCode(data, status) : null;
    const failureMessage =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureMessage(data, status) : null;
    const retryable = mappedStatus === PaymentStatus.FAILED;

    return {
      provider: this.provider,
      externalEventId: dto.eventId,
      eventType: dto.eventType,
      providerReference,
      mappedStatus,
      failureCode,
      failureMessage,
      retryable,
      rawPayload: payload,
      normalizedPayload: this.buildNormalizedPayload(data, payload, dto, mappedStatus, providerReference, status, failureCode, failureMessage),
    };
  }

  async verifyTransactionByReference(txRef: string): Promise<TransactionVerificationResult> {
    const secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
    if (!secretKey) {
      throw new BadGatewayException({
        code: 'FLUTTERWAVE_NOT_CONFIGURED',
        message: 'Flutterwave secret key is not configured',
      });
    }

    const url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = this.asRecord(responseBody['data']);
    const providerStatus = String(data['status'] ?? responseBody['status'] ?? 'unknown');
    const mappedStatus = this.mapStatus(providerStatus);
    const verified = response.ok && responseBody['status'] === 'success' && mappedStatus === PaymentStatus.SUCCESS;
    const failureCode =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureCode(data, providerStatus) : null;
    const failureMessage =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureMessage(data, providerStatus) : null;

    return {
      verified,
      mappedStatus,
      providerReference: txRef,
      rawPayload: responseBody,
      normalizedPayload: {
        provider: this.provider,
        eventType: 'charge.completed',
        status: mappedStatus,
        providerStatus,
        providerTransactionId: data['id'] ?? null,
        txRef,
        amount: data['amount'] ?? null,
        currency: data['currency'] ?? null,
        paymentToken: this.extractPaymentToken(data),
        failureCode,
        failureMessage,
      },
      failureCode,
      failureMessage,
    };
  }

  async chargeTokenizedPayment(request: TokenizedChargeRequest): Promise<TokenizedChargeResult> {
    const secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
    if (!secretKey) {
      throw new BadGatewayException({
        code: 'FLUTTERWAVE_NOT_CONFIGURED',
        message: 'Flutterwave secret key is not configured',
      });
    }

    const payload = {
      token: request.token,
      email: request.email,
      amount: request.amount,
      currency: request.currency,
      tx_ref: request.txRef,
      meta: request.metadata,
    };

    const response = await fetch('https://api.flutterwave.com/v3/tokenized-charges', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = this.asRecord(responseBody['data']);
    const providerStatus = String(data['status'] ?? responseBody['status'] ?? 'unknown');
    const mappedStatus = this.mapStatus(providerStatus);
    const success = response.ok && responseBody['status'] === 'success' && mappedStatus === PaymentStatus.SUCCESS;
    const failureCode =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureCode(data, providerStatus) : null;
    const failureMessage =
      mappedStatus === PaymentStatus.FAILED ? this.extractFailureMessage(data, providerStatus) : null;

    return {
      success,
      providerReference: request.txRef,
      mappedStatus,
      rawPayload: responseBody,
      normalizedPayload: {
        provider: this.provider,
        eventType: 'charge.completed',
        status: mappedStatus,
        providerStatus,
        providerTransactionId: data['id'] ?? null,
        txRef: request.txRef,
        amount: data['amount'] ?? request.amount,
        currency: data['currency'] ?? request.currency,
        paymentToken: request.token,
        failureCode,
        failureMessage,
      },
      failureCode,
      failureMessage,
    };
  }

  private buildNormalizedPayload(
    data: Record<string, unknown>,
    payload: Record<string, unknown>,
    dto: PaymentWebhookDto,
    mappedStatus: PaymentStatus,
    providerReference: string | undefined,
    status: string,
    failureCode: string | null,
    failureMessage: string | null,
  ): Record<string, unknown> {
    return {
      provider: this.provider,
      eventType: dto.eventType,
      eventId: dto.eventId,
      status: mappedStatus,
      providerStatus: status,
      providerTransactionId: data['id'] ?? payload['id'] ?? null,
      txRef: providerReference ?? null,
      amount: data['amount'] ?? payload['amount'] ?? null,
      currency: data['currency'] ?? payload['currency'] ?? null,
      paymentToken: this.extractPaymentToken(data),
      customerEmail:
        this.asRecord(data['customer'])['email'] ??
        payload['customerEmail'] ??
        payload['email'] ??
        null,
      failureCode,
      failureMessage,
    };
  }

  private extractPaymentToken(data: Record<string, unknown>): string | null {
    const card = this.asRecord(data['card']);
    const token =
      this.stringFrom(card['token']) ??
      this.stringFrom(data['token']) ??
      this.stringFrom(this.asRecord(data['authorization'])['token']);
    return token ?? null;
  }

  private mapStatus(status: string): PaymentStatus {
    const normalized = status.toLowerCase();
    if (normalized === 'successful' || normalized === 'success' || normalized.includes('completed')) {
      return PaymentStatus.SUCCESS;
    }
    if (normalized.includes('fail') || normalized.includes('declined') || normalized === 'cancelled') {
      return PaymentStatus.FAILED;
    }
    return PaymentStatus.PENDING;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringFrom(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private extractFailureCode(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureCode'] ??
      payload['errorCode'] ??
      payload['code'] ??
      payload['status'] ??
      eventType;
    return String(raw).trim().slice(0, 100) || 'PAYMENT_FAILED';
  }

  private extractFailureMessage(payload: Record<string, unknown>, eventType: string): string {
    const raw =
      payload['failureMessage'] ??
      payload['errorMessage'] ??
      payload['message'] ??
      `Flutterwave event indicates failure: ${eventType}`;
    return String(raw).trim().slice(0, 500);
  }
}
