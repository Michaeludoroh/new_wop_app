import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  TransactionType,
  WebhookProcessingStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';
import { ObservabilityService } from '../../observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service';
import { InitiateEbookCheckoutDto } from './dto/initiate-ebook-checkout.dto';
import { InitiateSubscriptionCheckoutDto } from './dto/initiate-subscription-checkout.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history-query.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

type TransactionMetadata = {
  purpose?: 'SUBSCRIPTION' | 'EBOOK_PURCHASE';
  ebookId?: string;
  planCode?: string;
  checkoutUrl?: string;
  flutterwaveTransactionId?: unknown;
  [key: string]: unknown;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly observability: ObservabilityService,
    private readonly configService: ConfigService,
    private readonly lifecycleService: SubscriptionLifecycleService,
  ) {}

  async initiateSubscriptionCheckout(userId: string, dto: InitiateSubscriptionCheckoutDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.planCode.trim().toUpperCase() },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Subscription plan not found or inactive',
      });
    }

    if (Number(plan.amount) <= 0) {
      throw new BadRequestException({
        code: 'FREE_PLAN_CHECKOUT_NOT_REQUIRED',
        message: 'This plan does not require Flutterwave checkout',
      });
    }

    const user = await this.getActiveUser(userId);
    const now = new Date();
    const txRef = this.generateReference('sub');
    const active = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const created = await this.prisma.$transaction(async (tx) => {
      if (active?.status === SubscriptionStatus.PENDING) {
        await tx.userSubscription.update({
          where: { id: active.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: now,
            cancellationReason: 'Replaced by new checkout initiation',
          },
        });
      }

      const subscription = await tx.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.PENDING,
          startedAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: dto.autoRenew === false,
          upgradeFromId: active?.status === SubscriptionStatus.ACTIVE || active?.status === SubscriptionStatus.GRACE ? active.id : undefined,
          metadata: {
            purpose: 'SUBSCRIPTION',
            planCode: plan.code,
            provider: PaymentProvider.FLUTTERWAVE,
          },
        },
      });

      const transaction = await tx.paymentTransaction.create({
        data: {
          userId,
          userSubscriptionId: subscription.id,
          subscriptionPlanId: plan.id,
          provider: PaymentProvider.FLUTTERWAVE,
          providerReference: txRef,
          transactionType: active
            ? TransactionType.SUBSCRIPTION_UPGRADE
            : TransactionType.SUBSCRIPTION_INITIAL,
          amount: plan.amount,
          currency: plan.currency,
          status: PaymentStatus.PENDING,
          initiatedAt: now,
          retryable: true,
          metadata: {
            purpose: 'SUBSCRIPTION',
            planCode: plan.code,
            billingInterval: plan.billingInterval,
          },
        },
      });

      return { subscription, transaction };
    });

    const checkout = await this.providerRegistry.resolve(PaymentProvider.FLUTTERWAVE).createCheckoutSession({
      txRef,
      amount: created.transaction.amount.toString(),
      currency: created.transaction.currency,
      redirectUrl: this.checkoutRedirectUrl(txRef),
      customer: {
        email: user.email,
        name: user.fullName,
      },
      title: `${plan.name} subscription`,
      description: `Subscription checkout for ${plan.name}`,
      metadata: {
        purpose: 'SUBSCRIPTION',
        userId,
        planCode: plan.code,
        subscriptionId: created.subscription.id,
        transactionId: created.transaction.id,
      },
    });

    const transaction = await this.prisma.paymentTransaction.update({
      where: { id: created.transaction.id },
      data: {
        providerPayload: checkout.rawPayload as Prisma.InputJsonValue,
        metadata: {
          purpose: 'SUBSCRIPTION',
          planCode: plan.code,
          billingInterval: plan.billingInterval,
          checkoutUrl: checkout.checkoutUrl,
        },
      },
    });

    return {
      message: 'Subscription checkout initiated',
      data: {
        transaction,
        subscription: created.subscription,
        checkoutUrl: checkout.checkoutUrl,
        providerReference: checkout.providerReference,
      },
    };
  }

  async initiateEbookCheckout(userId: string, dto: InitiateEbookCheckoutDto) {
    const ebook = await this.prisma.ebook.findFirst({
      where: { id: dto.ebookId, deletedAt: null },
    });

    if (!ebook) {
      throw new NotFoundException('eBook not found');
    }

    const existing = await this.prisma.ebookPurchase.findUnique({
      where: { userId_ebookId: { userId, ebookId: ebook.id } },
    });

    if (existing) {
      return {
        message: 'eBook already purchased',
        data: {
          purchased: true,
          purchase: existing,
        },
      };
    }

    if (Number(ebook.price) <= 0) {
      throw new BadRequestException({
        code: 'FREE_EBOOK_CHECKOUT_NOT_REQUIRED',
        message: 'This eBook does not require checkout',
      });
    }

    const user = await this.getActiveUser(userId);
    const txRef = this.generateReference('ebook');

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        provider: PaymentProvider.FLUTTERWAVE,
        providerReference: txRef,
        transactionType: TransactionType.EBOOK_PURCHASE,
        amount: ebook.price,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        initiatedAt: new Date(),
        retryable: true,
        metadata: {
          purpose: 'EBOOK_PURCHASE',
          ebookId: ebook.id,
        },
      },
    });

    const checkout = await this.providerRegistry.resolve(PaymentProvider.FLUTTERWAVE).createCheckoutSession({
      txRef,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      redirectUrl: this.checkoutRedirectUrl(txRef),
      customer: {
        email: user.email,
        name: user.fullName,
      },
      title: ebook.title,
      description: `eBook purchase for ${ebook.title}`,
      metadata: {
        purpose: 'EBOOK_PURCHASE',
        userId,
        ebookId: ebook.id,
        transactionId: transaction.id,
      },
    });

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        providerPayload: checkout.rawPayload as Prisma.InputJsonValue,
        metadata: {
          purpose: 'EBOOK_PURCHASE',
          ebookId: ebook.id,
          checkoutUrl: checkout.checkoutUrl,
        },
      },
    });

    return {
      message: 'eBook checkout initiated',
      data: {
        transaction: updated,
        checkoutUrl: checkout.checkoutUrl,
        providerReference: checkout.providerReference,
      },
    };
  }

  async getHistory(requestingUserId: string, role: string, query: PaymentHistoryQueryDto) {
    const isElevated = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const targetUserId = isElevated ? query.userId : requestingUserId;

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        status: query.status,
      },
      include: {
        userSubscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { data: transactions };
  }

  async getStatus(requestingUserId: string, role: string, providerReference: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference },
      include: {
        userSubscription: { include: { plan: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        code: 'PAYMENT_TRANSACTION_NOT_FOUND',
        message: 'Payment transaction not found',
      });
    }

    const isElevated = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isElevated && transaction.userId !== requestingUserId) {
      throw new ForbiddenException('You can only inspect your own payment status');
    }

    return { data: transaction };
  }

  async completePayment(providerReference: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference },
      include: {
        userSubscription: { include: { plan: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        code: 'PAYMENT_TRANSACTION_NOT_FOUND',
        message: 'Payment transaction not found',
      });
    }

    if (transaction.status === PaymentStatus.SUCCESS) {
      return this.buildPaymentCompleteResponse(true, transaction);
    }

    if (transaction.status === PaymentStatus.FAILED && !transaction.retryable) {
      return this.buildPaymentCompleteResponse(false, transaction);
    }

    const adapter = this.providerRegistry.resolve(PaymentProvider.FLUTTERWAVE);
    const verification = await adapter.verifyTransactionByReference(providerReference);

    const webhookReconciled = await this.reconcileWebhookIfProcessed(providerReference);
    if (webhookReconciled) {
      const refreshed = await this.prisma.paymentTransaction.findUnique({
        where: { providerReference },
        include: { userSubscription: { include: { plan: true } } },
      });
      if (refreshed) {
        return this.buildPaymentCompleteResponse(
          refreshed.status === PaymentStatus.SUCCESS,
          refreshed,
        );
      }
    }

    if (verification.mappedStatus === PaymentStatus.SUCCESS) {
      this.assertVerifiedPaymentMatchesTransaction(transaction, verification.normalizedPayload);
      await this.applyProviderPaymentOutcome(providerReference, {
        mappedStatus: PaymentStatus.SUCCESS,
        normalizedPayload: verification.normalizedPayload,
        failureCode: null,
        failureMessage: null,
        retryable: false,
        source: 'redirect_complete',
      });
    } else if (verification.mappedStatus === PaymentStatus.FAILED) {
      await this.applyProviderPaymentOutcome(providerReference, {
        mappedStatus: PaymentStatus.FAILED,
        normalizedPayload: verification.normalizedPayload,
        failureCode: verification.failureCode ?? 'PAYMENT_FAILED',
        failureMessage: verification.failureMessage ?? 'Payment verification failed',
        retryable: verification.mappedStatus === PaymentStatus.FAILED,
        source: 'redirect_complete',
      });
    } else {
      return {
        message: 'Payment still pending',
        data: {
          success: false,
          status: PaymentStatus.PENDING,
          providerReference,
          transactionId: transaction.id,
          subscriptionStatus: transaction.userSubscription?.status ?? null,
        },
      };
    }

    const updated = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference },
      include: { userSubscription: { include: { plan: true } } },
    });

    if (!updated) {
      throw new NotFoundException({
        code: 'PAYMENT_TRANSACTION_NOT_FOUND',
        message: 'Payment transaction not found after reconciliation',
      });
    }

    return this.buildPaymentCompleteResponse(updated.status === PaymentStatus.SUCCESS, updated);
  }

  async initiateSubscriptionRenewalCharge(input: {
    subscriptionId: string;
    userId: string;
    retryAttempt: number;
    maxRetryCount: number;
  }) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: input.subscriptionId },
      include: {
        plan: true,
        user: { select: { id: true, email: true, fullName: true, deletedAt: true } },
      },
    });

    if (!subscription?.plan || !subscription.user || subscription.user.deletedAt) {
      throw new NotFoundException('Subscription or plan not found for renewal');
    }

    if (Number(subscription.plan.amount) <= 0) {
      throw new BadRequestException({
        code: 'FREE_PLAN_RENEWAL_NOT_REQUIRED',
        message: 'Free plans do not require Flutterwave renewal charges',
      });
    }

    const now = new Date();
    const providerReference = `wop_retry_${randomUUID()}`;
    const adapter = this.providerRegistry.resolve(PaymentProvider.FLUTTERWAVE);
    const paymentToken = await this.resolveRenewalPaymentToken(subscription.id);

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId: input.userId,
        userSubscriptionId: subscription.id,
        subscriptionPlanId: subscription.planId,
        provider: PaymentProvider.FLUTTERWAVE,
        providerReference,
        transactionType: TransactionType.RETRY_CHARGE,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency,
        status: PaymentStatus.PENDING,
        retryable: input.retryAttempt < input.maxRetryCount,
        retryCount: input.retryAttempt,
        nextRetryAt:
          input.retryAttempt < input.maxRetryCount
            ? new Date(now.getTime() + 30 * 60 * 1000)
            : null,
        metadata: {
          purpose: 'SUBSCRIPTION',
          lifecycle: 'retry_due',
          retryAttempt: input.retryAttempt,
          planCode: subscription.plan.code,
          billingInterval: subscription.plan.billingInterval,
          paymentTokenPresent: Boolean(paymentToken),
        },
      },
    });

    if (!paymentToken) {
      return {
        charged: false,
        providerReference,
        transactionId: transaction.id,
        status: PaymentStatus.PENDING,
        message: 'Renewal charge pending; no stored payment token available',
      };
    }

    const charge = await adapter.chargeTokenizedPayment({
      txRef: providerReference,
      amount: subscription.plan.amount.toString(),
      currency: subscription.plan.currency,
      email: subscription.user.email,
      token: paymentToken,
      metadata: {
        purpose: 'SUBSCRIPTION',
        subscriptionId: subscription.id,
        retryAttempt: input.retryAttempt,
        planCode: subscription.plan.code,
      },
    });

    if (charge.mappedStatus === PaymentStatus.SUCCESS) {
      this.assertVerifiedPaymentMatchesTransaction(transaction, charge.normalizedPayload);
      await this.applyProviderPaymentOutcome(providerReference, {
        mappedStatus: PaymentStatus.SUCCESS,
        normalizedPayload: charge.normalizedPayload,
        failureCode: null,
        failureMessage: null,
        retryable: false,
        source: 'renewal_charge',
      });

      return {
        charged: true,
        providerReference,
        transactionId: transaction.id,
        status: PaymentStatus.SUCCESS,
        message: 'Renewal charge completed via Flutterwave',
      };
    }

    await this.applyProviderPaymentOutcome(providerReference, {
      mappedStatus: PaymentStatus.FAILED,
      normalizedPayload: charge.normalizedPayload,
      failureCode: charge.failureCode ?? 'RENEWAL_CHARGE_FAILED',
      failureMessage: charge.failureMessage ?? 'Flutterwave renewal charge failed',
      retryable: input.retryAttempt < input.maxRetryCount,
      source: 'renewal_charge',
    });

    return {
      charged: false,
      providerReference,
      transactionId: transaction.id,
      status: PaymentStatus.FAILED,
      message: charge.failureMessage ?? 'Flutterwave renewal charge failed',
    };
  }

  renderPaymentCompletePage(result: {
    message: string;
    data: Record<string, unknown>;
  }) {
    const success = Boolean(result.data['success']);
    const status = String(result.data['status'] ?? 'UNKNOWN');
    const providerReference = String(result.data['providerReference'] ?? '');
    const title = success ? 'Payment Successful' : 'Payment Incomplete';
    const accent = success ? '#15803d' : '#b45309';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; }
    main { max-width: 32rem; margin: 0 auto; background: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 30px rgba(15,23,42,.08); }
    h1 { margin-top: 0; color: ${accent}; }
    code { background: #f1f5f9; padding: .15rem .35rem; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${result.message}</p>
    <p>Reference: <code>${providerReference}</code></p>
    <p>Status: <strong>${status}</strong></p>
    <p>You may close this window and return to the app.</p>
  </main>
</body>
</html>`;
  }

  async listWebhookEvents() {
    const events = await this.prisma.paymentWebhookEvent.findMany({
      orderBy: [{ receivedAt: 'desc' }],
      take: 100,
      include: {
        paymentTransaction: true,
      },
    });

    return { data: events };
  }

  createWebhookDto(
    provider: string,
    signature: string | undefined,
    payload: Record<string, unknown>,
  ): PaymentWebhookDto {
    const normalizedProvider = provider.trim().toUpperCase();
    if (normalizedProvider !== PaymentProvider.FLUTTERWAVE) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_PAYMENT_PROVIDER',
        message: 'Only Flutterwave webhooks are enabled',
      });
    }

    const data = this.asRecord(payload['data']);
    const txRef = this.stringFrom(data['tx_ref']) ?? this.stringFrom(payload['tx_ref']);
    const providerTransactionId = this.stringFrom(data['id']) ?? this.stringFrom(payload['id']);
    const eventType =
      this.stringFrom(payload['event']) ??
      this.stringFrom(payload['event.type']) ??
      this.stringFrom(data['status']) ??
      'charge.completed';
    const eventId =
      this.stringFrom(payload['id']) ??
      providerTransactionId ??
      `${eventType}:${txRef ?? this.computeEventHash(normalizedProvider, eventType, payload)}`;

    return {
      provider: PaymentProvider.FLUTTERWAVE,
      eventId,
      eventType,
      signature: signature ?? '',
      providerReference: txRef,
      payload,
    };
  }

  async processWebhook(dto: PaymentWebhookDto) {
    const adapter = this.providerRegistry.resolve(dto.provider);
    const verification = await adapter.verifySignature(dto);

    if (!verification.isValid) {
      this.observability.recordPaymentFailure(dto.provider, 'invalid_signature');
      Sentry.captureMessage('payment_webhook_signature_invalid', {
        level: 'warning',
        tags: { provider: dto.provider },
        extra: { eventId: dto.eventId, eventType: dto.eventType },
      });
      throw new BadRequestException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: verification.reason ?? 'Invalid webhook signature',
      });
    }

    const normalizedEvent = await adapter.normalizeEvent(dto);
    const eventHash = this.computeEventHash(dto.provider, dto.eventId, dto.payload);

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: dto.provider,
          externalEventId: dto.eventId,
        },
      },
    });

    if (existing) {
      if (existing.processingStatus !== WebhookProcessingStatus.DUPLICATE) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id: existing.id },
          data: {
            processingStatus: WebhookProcessingStatus.DUPLICATE,
            processedAt: existing.processedAt ?? new Date(),
          },
        });
      }

      return {
        message: 'Webhook already received',
        data: {
          webhookEventId: existing.id,
          externalEventId: existing.externalEventId,
          status: WebhookProcessingStatus.DUPLICATE,
          duplicate: true,
        },
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const webhookEvent = await tx.paymentWebhookEvent.create({
        data: {
          provider: dto.provider,
          externalEventId: dto.eventId,
          eventType: dto.eventType,
          eventHash,
          signatureValid: true,
          rawPayload: dto.payload as Prisma.InputJsonValue,
          normalizedPayload: normalizedEvent.normalizedPayload as Prisma.InputJsonValue,
          processingStatus: WebhookProcessingStatus.RECEIVED,
          receivedAt: new Date(),
        },
      });

      const providerReference = dto.providerReference;
      if (!providerReference) {
        await tx.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processingStatus: WebhookProcessingStatus.FAILED,
            errorMessage: 'providerReference missing from event',
            processedAt: new Date(),
          },
        });

        this.observability.recordPaymentFailure(dto.provider, 'missing_provider_reference');
        Sentry.captureMessage('payment_webhook_invalid_payload', {
          level: 'warning',
          tags: { provider: dto.provider },
          extra: { eventId: dto.eventId, eventType: dto.eventType },
        });

        throw new BadRequestException({
          code: 'WEBHOOK_INVALID_PAYLOAD',
          message: 'providerReference is required to reconcile payment',
        });
      }

      const txRecord = await tx.paymentTransaction.findUnique({
        where: { providerReference },
      });

      if (!txRecord) {
        await tx.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processingStatus: WebhookProcessingStatus.FAILED,
            errorMessage: 'Payment transaction not found for providerReference',
            processedAt: new Date(),
          },
        });

        this.observability.recordPaymentFailure(dto.provider, 'transaction_not_found');
        Sentry.captureMessage('payment_transaction_not_found', {
          level: 'warning',
          tags: { provider: dto.provider },
          extra: { eventId: dto.eventId, providerReference },
        });

        throw new NotFoundException({
          code: 'PAYMENT_TRANSACTION_NOT_FOUND',
          message: 'No payment transaction matched this webhook event',
        });
      }

      const mappedStatus = normalizedEvent.mappedStatus;
      if (mappedStatus === PaymentStatus.SUCCESS) {
        this.assertVerifiedPaymentMatchesTransaction(txRecord, normalizedEvent.normalizedPayload);
      }
      const now = new Date();
      const maxRetryCount = 3;
      const retryWindowMinutes = 30;
      const shouldRetry =
        mappedStatus === PaymentStatus.FAILED &&
        (normalizedEvent.retryable ?? txRecord.retryable ?? true);
      const nextRetryCount = shouldRetry ? (txRecord.retryCount ?? 0) + 1 : txRecord.retryCount ?? 0;
      const retryExhausted = shouldRetry && nextRetryCount >= maxRetryCount;
      const nextRetryAt =
        shouldRetry && !retryExhausted
          ? new Date(now.getTime() + retryWindowMinutes * 60 * 1000)
          : null;
      const failureCode = mappedStatus === PaymentStatus.FAILED ? normalizedEvent.failureCode ?? 'PAYMENT_FAILED' : null;
      const failureMessage =
        mappedStatus === PaymentStatus.FAILED
          ? normalizedEvent.failureMessage ?? `Webhook event indicates failed payment: ${dto.eventType}`
          : null;

      const updatedTx = await tx.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status:
            mappedStatus === PaymentStatus.FAILED && shouldRetry && !retryExhausted
              ? PaymentStatus.PENDING
              : mappedStatus,
          paidAt: mappedStatus === PaymentStatus.SUCCESS ? now : txRecord.paidAt,
          failedAt: mappedStatus === PaymentStatus.FAILED ? now : txRecord.failedAt,
          failureCode,
          failureMessage,
          retryable: mappedStatus === PaymentStatus.FAILED ? shouldRetry && !retryExhausted : txRecord.retryable,
          retryCount: nextRetryCount,
          nextRetryAt,
          normalizedEvent: normalizedEvent.normalizedPayload as Prisma.InputJsonValue,
          metadata:
            mappedStatus === PaymentStatus.SUCCESS
              ? ({
                  ...this.asMetadata(txRecord.metadata),
                  paymentToken:
                    this.stringFrom(normalizedEvent.normalizedPayload['paymentToken']) ??
                    this.asMetadata(txRecord.metadata).paymentToken,
                } as Prisma.InputJsonValue)
              : undefined,
        },
      });

      if (txRecord.userSubscriptionId) {
        const existingSubscription = await tx.userSubscription.findUnique({
          where: { id: txRecord.userSubscriptionId },
        });
        const periodEnd = this.calculatePeriodEnd(now, txRecord.metadata);
        const maxRetryCount = existingSubscription?.maxRetryCount ?? 3;
        const retryExhaustedForSub = shouldRetry && nextRetryCount >= maxRetryCount;
        const nextStatus =
          mappedStatus === PaymentStatus.SUCCESS
            ? SubscriptionStatus.ACTIVE
            : mappedStatus === PaymentStatus.FAILED
              ? retryExhaustedForSub
                ? SubscriptionStatus.CANCELLED
                : SubscriptionStatus.GRACE
              : existingSubscription?.status;
        const subscriptionUpdate: Prisma.UserSubscriptionUpdateInput = {
          lastPaymentAttemptAt: now,
          retryCount: nextRetryCount,
          nextRetryAt,
          status: nextStatus,
          startedAt: mappedStatus === PaymentStatus.SUCCESS ? now : undefined,
          currentPeriodStart: mappedStatus === PaymentStatus.SUCCESS ? now : undefined,
          currentPeriodEnd: mappedStatus === PaymentStatus.SUCCESS ? periodEnd : undefined,
          graceEndsAt:
            mappedStatus === PaymentStatus.FAILED && !retryExhaustedForSub
              ? this.lifecycleService.buildGraceEndsAt(now)
              : mappedStatus === PaymentStatus.SUCCESS
                ? null
                : undefined,
          cancelledAt:
            mappedStatus === PaymentStatus.FAILED && retryExhaustedForSub
              ? now
              : undefined,
          cancellationReason:
            mappedStatus === PaymentStatus.FAILED && retryExhaustedForSub
              ? 'Automatic cancellation after retry exhaustion'
              : undefined,
        };

        const updatedSubscription = await tx.userSubscription.update({
          where: { id: txRecord.userSubscriptionId },
          data: subscriptionUpdate,
        });

        if (
          existingSubscription &&
          nextStatus &&
          existingSubscription.status !== nextStatus
        ) {
          await this.lifecycleService.recordStatusChange(tx, {
            subscriptionId: existingSubscription.id,
            userId: existingSubscription.userId,
            fromStatus: existingSubscription.status,
            toStatus: nextStatus,
            reason:
              mappedStatus === PaymentStatus.SUCCESS
                ? 'Payment verified via webhook'
                : retryExhaustedForSub
                  ? 'Payment failed; retries exhausted'
                  : 'Payment failed; grace period started',
            metadata: { providerReference },
          });
        }
      }

      const metadata = this.asMetadata(txRecord.metadata);
      if (mappedStatus === PaymentStatus.SUCCESS && metadata.purpose === 'EBOOK_PURCHASE') {
        const ebookId = metadata.ebookId;
        if (!ebookId) {
          throw new BadRequestException({
            code: 'EBOOK_PAYMENT_METADATA_MISSING',
            message: 'eBook payment transaction is missing ebookId metadata',
          });
        }

        const ebook = await tx.ebook.findUnique({ where: { id: ebookId } });
        if (!ebook) {
          throw new NotFoundException('eBook not found for payment transaction');
        }

        await tx.ebookPurchase.upsert({
          where: {
            userId_ebookId: {
              userId: txRecord.userId,
              ebookId,
            },
          },
          update: {
            paymentReference: txRecord.providerReference,
            amount: txRecord.amount,
          },
          create: {
            userId: txRecord.userId,
            ebookId,
            paymentReference: txRecord.providerReference,
            amount: txRecord.amount,
          },
        });
      }

      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.PROCESSED,
          paymentTransactionId: updatedTx.id,
          normalizedPayload: {
            provider: dto.provider,
            eventType: dto.eventType,
            providerReference,
            mappedStatus,
          } as Prisma.InputJsonValue,
          processedAt: now,
        },
      });

      return { webhookEventId: webhookEvent.id, paymentTransactionId: updatedTx.id };
    });

    return { message: 'Webhook processed', data: result };
  }

  private computeEventHash(provider: string, eventId: string, payload: Record<string, unknown>) {
    const raw = `${provider}:${eventId}:${JSON.stringify(payload)}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private async getActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private generateReference(prefix: string) {
    return `wop_${prefix}_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  private checkoutRedirectUrl(providerReference: string) {
    const baseUrl =
      this.configService.get<string>('PAYMENT_REDIRECT_BASE_URL') ??
      this.configService.get<string>('NEXT_PUBLIC_API_BASE_URL') ??
      'http://localhost:4000/api/v1';
    return `${baseUrl.replace(/\/$/, '')}/payments/complete?tx_ref=${encodeURIComponent(providerReference)}`;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asMetadata(value: Prisma.JsonValue | null): TransactionMetadata {
    return this.asRecord(value) as TransactionMetadata;
  }

  private stringFrom(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return undefined;
  }

  private calculatePeriodEnd(now: Date, metadata: Prisma.JsonValue | null) {
    const billingInterval = String(this.asMetadata(metadata).billingInterval ?? 'MONTHLY').toUpperCase();
    const months = billingInterval === 'YEARLY' ? 12 : billingInterval === 'QUARTERLY' ? 3 : 1;
    const end = new Date(now);
    end.setMonth(end.getMonth() + months);
    return end;
  }

  private assertVerifiedPaymentMatchesTransaction(
    transaction: { amount: Prisma.Decimal; currency: string; providerReference: string },
    normalizedPayload: Record<string, unknown>,
  ) {
    const providerAmount = this.numberFrom(normalizedPayload['amount']);
    const providerCurrency = this.stringFrom(normalizedPayload['currency']);

    if (providerAmount == null) {
      throw new BadRequestException({
        code: 'WEBHOOK_AMOUNT_MISSING',
        message: 'Verified payment event did not include an amount',
      });
    }

    if (Number(transaction.amount) !== providerAmount) {
      throw new BadRequestException({
        code: 'WEBHOOK_AMOUNT_MISMATCH',
        message: 'Verified payment amount does not match pending transaction',
      });
    }

    if (!providerCurrency || providerCurrency.toUpperCase() !== transaction.currency.toUpperCase()) {
      throw new BadRequestException({
        code: 'WEBHOOK_CURRENCY_MISMATCH',
        message: 'Verified payment currency does not match pending transaction',
      });
    }
  }

  private numberFrom(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private buildPaymentCompleteResponse(
    success: boolean,
    transaction: {
      id: string;
      status: PaymentStatus;
      providerReference: string;
      failureMessage?: string | null;
      userSubscription?: { status: SubscriptionStatus; plan?: { code: string } | null } | null;
    },
  ) {
    return {
      message: success ? 'Payment completed successfully' : 'Payment could not be completed',
      data: {
        success,
        status: transaction.status,
        providerReference: transaction.providerReference,
        transactionId: transaction.id,
        subscriptionStatus: transaction.userSubscription?.status ?? null,
        planCode: transaction.userSubscription?.plan?.code ?? null,
        failureMessage: transaction.failureMessage ?? null,
      },
    };
  }

  private async reconcileWebhookIfProcessed(providerReference: string) {
    const processed = await this.prisma.paymentWebhookEvent.findFirst({
      where: {
        processingStatus: WebhookProcessingStatus.PROCESSED,
        paymentTransaction: { providerReference },
      },
      orderBy: { processedAt: 'desc' },
    });
    return Boolean(processed);
  }

  private async resolveRenewalPaymentToken(subscriptionId: string) {
    const lastSuccess = await this.prisma.paymentTransaction.findFirst({
      where: {
        userSubscriptionId: subscriptionId,
        status: PaymentStatus.SUCCESS,
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!lastSuccess) {
      return null;
    }

    const metadataToken = this.stringFrom(this.asMetadata(lastSuccess.metadata).paymentToken);
    if (metadataToken) {
      return metadataToken;
    }

    const normalized = this.asRecord(lastSuccess.normalizedEvent);
    return this.stringFrom(normalized['paymentToken']) ?? null;
  }

  private async applyProviderPaymentOutcome(
    providerReference: string,
    input: {
      mappedStatus: PaymentStatus;
      normalizedPayload: Record<string, unknown>;
      failureCode?: string | null;
      failureMessage?: string | null;
      retryable?: boolean;
      source: string;
    },
  ) {
    const txRecord = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference },
    });

    if (!txRecord) {
      throw new NotFoundException({
        code: 'PAYMENT_TRANSACTION_NOT_FOUND',
        message: 'Payment transaction not found',
      });
    }

    if (txRecord.status === PaymentStatus.SUCCESS) {
      return txRecord;
    }

    const now = new Date();
    const maxRetryCount = 3;
    const retryWindowMinutes = 30;
    const shouldRetry =
      input.mappedStatus === PaymentStatus.FAILED && (input.retryable ?? txRecord.retryable ?? true);
    const nextRetryCount = shouldRetry ? (txRecord.retryCount ?? 0) + 1 : txRecord.retryCount ?? 0;
    const retryExhausted = shouldRetry && nextRetryCount >= maxRetryCount;
    const nextRetryAt =
      shouldRetry && !retryExhausted
        ? new Date(now.getTime() + retryWindowMinutes * 60 * 1000)
        : null;

    return this.prisma.$transaction(async (tx) => {
      const updatedTx = await tx.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status:
            input.mappedStatus === PaymentStatus.FAILED && shouldRetry && !retryExhausted
              ? PaymentStatus.PENDING
              : input.mappedStatus,
          paidAt: input.mappedStatus === PaymentStatus.SUCCESS ? now : txRecord.paidAt,
          failedAt: input.mappedStatus === PaymentStatus.FAILED ? now : txRecord.failedAt,
          failureCode: input.mappedStatus === PaymentStatus.FAILED ? input.failureCode ?? 'PAYMENT_FAILED' : null,
          failureMessage:
            input.mappedStatus === PaymentStatus.FAILED
              ? input.failureMessage ?? 'Payment could not be verified'
              : null,
          retryable:
            input.mappedStatus === PaymentStatus.FAILED ? shouldRetry && !retryExhausted : txRecord.retryable,
          retryCount: nextRetryCount,
          nextRetryAt,
          normalizedEvent: input.normalizedPayload as Prisma.InputJsonValue,
          metadata:
            input.mappedStatus === PaymentStatus.SUCCESS
              ? ({
                  ...this.asMetadata(txRecord.metadata),
                  paymentToken:
                    this.stringFrom(input.normalizedPayload['paymentToken']) ??
                    this.asMetadata(txRecord.metadata).paymentToken,
                  reconciliationSource: input.source,
                } as Prisma.InputJsonValue)
              : ({
                  ...this.asMetadata(txRecord.metadata),
                  reconciliationSource: input.source,
                } as Prisma.InputJsonValue),
        },
      });

      if (txRecord.userSubscriptionId) {
        const existingSubscription = await tx.userSubscription.findUnique({
          where: { id: txRecord.userSubscriptionId },
        });
        const periodEnd = this.calculatePeriodEnd(now, txRecord.metadata);
        const maxRetryCountForSub = existingSubscription?.maxRetryCount ?? 3;
        const retryExhaustedForSub = shouldRetry && nextRetryCount >= maxRetryCountForSub;
        const nextStatus =
          input.mappedStatus === PaymentStatus.SUCCESS
            ? SubscriptionStatus.ACTIVE
            : input.mappedStatus === PaymentStatus.FAILED
              ? retryExhaustedForSub
                ? SubscriptionStatus.CANCELLED
                : SubscriptionStatus.GRACE
              : existingSubscription?.status;

        await tx.userSubscription.update({
          where: { id: txRecord.userSubscriptionId },
          data: {
            lastPaymentAttemptAt: now,
            retryCount: nextRetryCount,
            nextRetryAt,
            status: nextStatus,
            startedAt: input.mappedStatus === PaymentStatus.SUCCESS ? now : undefined,
            currentPeriodStart: input.mappedStatus === PaymentStatus.SUCCESS ? now : undefined,
            currentPeriodEnd: input.mappedStatus === PaymentStatus.SUCCESS ? periodEnd : undefined,
            graceEndsAt:
              input.mappedStatus === PaymentStatus.FAILED && !retryExhaustedForSub
                ? this.lifecycleService.buildGraceEndsAt(now)
                : input.mappedStatus === PaymentStatus.SUCCESS
                  ? null
                  : undefined,
            cancelledAt:
              input.mappedStatus === PaymentStatus.FAILED && retryExhaustedForSub ? now : undefined,
            cancellationReason:
              input.mappedStatus === PaymentStatus.FAILED && retryExhaustedForSub
                ? 'Automatic cancellation after retry exhaustion'
                : undefined,
          },
        });

        if (
          existingSubscription &&
          nextStatus &&
          existingSubscription.status !== nextStatus
        ) {
          await this.lifecycleService.recordStatusChange(tx, {
            subscriptionId: existingSubscription.id,
            userId: existingSubscription.userId,
            fromStatus: existingSubscription.status,
            toStatus: nextStatus,
            reason:
              input.mappedStatus === PaymentStatus.SUCCESS
                ? `Payment verified via ${input.source}`
                : retryExhaustedForSub
                  ? 'Payment failed; retries exhausted'
                  : 'Payment failed; grace period started',
            metadata: { providerReference, source: input.source },
          });
        }
      }

      const metadata = this.asMetadata(txRecord.metadata);
      if (input.mappedStatus === PaymentStatus.SUCCESS && metadata.purpose === 'EBOOK_PURCHASE') {
        const ebookId = metadata.ebookId;
        if (ebookId) {
          await tx.ebookPurchase.upsert({
            where: {
              userId_ebookId: {
                userId: txRecord.userId,
                ebookId,
              },
            },
            update: {
              paymentReference: txRecord.providerReference,
              amount: txRecord.amount,
            },
            create: {
              userId: txRecord.userId,
              ebookId,
              paymentReference: txRecord.providerReference,
              amount: txRecord.amount,
            },
          });
        }
      }

      return updatedTx;
    });
  }
}
