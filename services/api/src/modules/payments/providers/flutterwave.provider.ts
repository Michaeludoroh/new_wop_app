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

  async verifyTransactionByReference(txRef: string): Promise<TransactionVerificationResult> {
    const secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
    if (!secretKey) {
      return {
        isVerified: false,
        mappedStatus: PaymentStatus.PENDING,
        providerReference: txRef,
        normalizedPayload: { error: 'FLUTTERWAVE_NOT_CONFIGURED' },
        failureMessage: 'Flutterwave secret key is not configured',
      };
    }

    const url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = this.asRecord(responseBody['data']);
    const providerStatus = String(data['status'] ?? responseBody['status'] ?? '');
    const mappedStatus = response.ok && responseBody['status'] === 'success'
      ? this.mapStatus(providerStatus)
      : PaymentStatus.PENDING;
    const card = this.asRecord(data['card']);
    const token = this.stringFrom(card['token']) ?? this.stringFrom(data['token']);

    return {
      isVerified: mappedStatus === PaymentStatus.SUCCESS,
      mappedStatus,
      providerReference: this.stringFrom(data['tx_ref']) ?? txRef,
      amount: this.numberFrom(data['amount']),
      currency: this.stringFrom(data['currency']),
      flutterwaveToken: token ?? null,
      normalizedPayload: {
        provider: this.provider,
        txRef: this.stringFrom(data['tx_ref']) ?? txRef,
        status: mappedStatus,
        providerStatus,
        amount: data['amount'] ?? null,
        currency: data['currency'] ?? null,
        flutterwaveToken: token ?? null,
        providerTransactionId: data['id'] ?? null,
      },
      failureMessage:
        mappedStatus === PaymentStatus.FAILED
          ? this.extractFailureMessage(data, providerStatus)
          : null,
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
    const providerStatus = String(data['status'] ?? responseBody['status'] ?? '');
    const mappedStatus =
      response.ok && responseBody['status'] === 'success'
        ? this.mapStatus(providerStatus)
        : PaymentStatus.FAILED;

    return {
      providerReference: request.txRef,
      mappedStatus,
      rawPayload: responseBody,
      normalizedPayload: {
        provider: this.provider,
        txRef: request.txRef,
        status: mappedStatus,
        providerStatus,
        amount: request.amount,
        currency: request.currency,
        flutterwaveToken: request.token,
        providerTransactionId: data['id'] ?? null,
      },
      flutterwaveToken: request.token,
      failureMessage:
        mappedStatus === PaymentStatus.FAILED
          ? this.extractFailureMessage(data, providerStatus)
          : null,
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
      normalizedPayload: {
        provider: this.provider,
        eventType: dto.eventType,
        eventId: dto.eventId,
        status: mappedStatus,
        providerStatus: status,
        providerTransactionId: data['id'] ?? payload['id'] ?? null,
        txRef: providerReference ?? null,
        amount: data['amount'] ?? payload['amount'] ?? null,
        currency: data['currency'] ?? payload['currency'] ?? null,
        flutterwaveToken:
          this.stringFrom(this.asRecord(data['card'])['token']) ??
          this.stringFrom(data['token']) ??
          null,
        customerEmail:
          this.asRecord(data['customer'])['email'] ??
          payload['customerEmail'] ??
          payload['email'] ??
          null,
        failureCode,
        failureMessage,
      },
    };
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

  private numberFrom(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
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
