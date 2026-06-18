import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProviderRegistry } from '../payments/providers/payment-provider.registry';

const DEFAULT_GRACE_DAYS = 7;
const RETRY_WINDOW_MINUTES = 30;

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentProviderRegistry))
    private readonly paymentProviderRegistry: PaymentProviderRegistry,
  ) {}

  async recordStatusChange(
    tx: Prisma.TransactionClient | PrismaService,
    input: {
      subscriptionId: string;
      userId: string;
      fromStatus: SubscriptionStatus | null;
      toStatus: SubscriptionStatus;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await tx.subscriptionStatusHistory.create({
      data: {
        subscriptionId: input.subscriptionId,
        userId: input.userId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async processDueLifecycleEvents() {
    const now = new Date();
    const graceEndsAtDefault = new Date(now.getTime() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000);

    const [trialActivations, periodEndCancellations, graceExpirations, periodRenewalGrace] =
      await Promise.all([
        this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.PENDING,
            trialEndsAt: { lte: now },
          },
        }),
        this.prisma.userSubscription.findMany({
          where: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: { lte: now },
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },
          },
        }),
        this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.GRACE,
            graceEndsAt: { lte: now },
          },
        }),
        this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: { lte: now },
          },
        }),
      ]);

    let processed = 0;

    for (const subscription of trialActivations) {
      await this.transitionSubscription(subscription, SubscriptionStatus.ACTIVE, {
        reason: 'Trial period completed',
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: this.calculatePeriodEnd(now, subscription.metadata),
      });
      processed += 1;
    }

    for (const subscription of periodEndCancellations) {
      await this.transitionSubscription(subscription, SubscriptionStatus.CANCELLED, {
        reason: 'Cancelled at period end',
        cancelledAt: now,
        graceEndsAt: null,
        nextRetryAt: null,
      });
      processed += 1;
    }

    for (const subscription of graceExpirations) {
      await this.transitionSubscription(subscription, SubscriptionStatus.CANCELLED, {
        reason: 'Grace period expired',
        cancelledAt: now,
        graceEndsAt: null,
        nextRetryAt: null,
      });
      processed += 1;
    }

    for (const subscription of periodRenewalGrace) {
      await this.transitionSubscription(subscription, SubscriptionStatus.GRACE, {
        reason: 'Renewal period ended; grace window opened',
        graceEndsAt: graceEndsAtDefault,
        nextRetryAt: now,
      });
      processed += 1;
    }

    const retryCandidates = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.GRACE,
        nextRetryAt: { lte: now },
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true } },
      },
    });

    for (const subscription of retryCandidates) {
      if (subscription.retryCount >= subscription.maxRetryCount) {
        await this.transitionSubscription(subscription, SubscriptionStatus.CANCELLED, {
          reason: 'Retry attempts exhausted',
          cancelledAt: now,
          graceEndsAt: null,
          nextRetryAt: null,
        });
        processed += 1;
        continue;
      }

      const nextRetryCount = subscription.retryCount + 1;
      const providerReference = `wop_retry_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const plan = subscription.plan;
      const amount = plan?.amount ?? new Prisma.Decimal(0);
      const currency = plan?.currency ?? 'USD';
      const metadataRecord = this.asRecord(subscription.metadata);
      const flutterwaveToken = this.stringFrom(metadataRecord.flutterwaveToken);
      const billingInterval = plan?.billingInterval ?? 'MONTHLY';

      if (!plan || Number(amount) <= 0) {
        await this.transitionSubscription(subscription, SubscriptionStatus.CANCELLED, {
          reason: 'Renewal plan missing or free tier cannot auto-renew',
          cancelledAt: now,
          graceEndsAt: null,
          nextRetryAt: null,
        });
        processed += 1;
        continue;
      }

      let chargeStatus: PaymentStatus = PaymentStatus.PENDING;
      let failureMessage: string | null = null;
      let normalizedPayload: Record<string, unknown> | null = null;

      if (flutterwaveToken && subscription.user?.email) {
        try {
          const adapter = this.paymentProviderRegistry.resolve(PaymentProvider.FLUTTERWAVE);
          const charge = await adapter.chargeTokenizedPayment({
            txRef: providerReference,
            amount: amount.toString(),
            currency,
            email: subscription.user.email,
            token: flutterwaveToken,
            metadata: {
              subscriptionId: subscription.id,
              lifecycle: 'retry_due',
              retryAttempt: nextRetryCount,
            },
          });
          chargeStatus = charge.mappedStatus;
          failureMessage = charge.failureMessage ?? null;
          normalizedPayload = charge.normalizedPayload;
        } catch (error) {
          chargeStatus = PaymentStatus.FAILED;
          failureMessage =
            error instanceof Error ? error.message : 'Flutterwave renewal charge failed';
        }
      } else {
        chargeStatus = PaymentStatus.FAILED;
        failureMessage = 'No saved Flutterwave payment token for automatic renewal';
      }

      const retryExhausted = nextRetryCount >= subscription.maxRetryCount;
      const chargeSucceeded = chargeStatus === PaymentStatus.SUCCESS;

      await this.prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            userId: subscription.userId,
            userSubscriptionId: subscription.id,
            subscriptionPlanId: plan.id,
            provider: PaymentProvider.FLUTTERWAVE,
            providerReference,
            transactionType: TransactionType.RETRY_CHARGE,
            amount,
            currency,
            status: chargeSucceeded ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
            paidAt: chargeSucceeded ? now : null,
            failedAt: chargeSucceeded ? null : now,
            failureMessage: chargeSucceeded ? null : failureMessage,
            retryable: !chargeSucceeded && !retryExhausted,
            retryCount: nextRetryCount,
            nextRetryAt:
              !chargeSucceeded && !retryExhausted
                ? new Date(now.getTime() + RETRY_WINDOW_MINUTES * 60 * 1000)
                : null,
            normalizedEvent: normalizedPayload as Prisma.InputJsonValue | undefined,
            metadata: {
              purpose: 'SUBSCRIPTION',
              lifecycle: 'retry_due',
              retryAttempt: nextRetryCount,
              billingInterval,
              planCode: plan.code,
            },
          },
        });

        if (chargeSucceeded) {
          const periodEnd = this.calculatePeriodEnd(now, subscription.metadata);
          await tx.userSubscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              retryCount: 0,
              graceEndsAt: null,
              nextRetryAt: null,
              lastPaymentAttemptAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelledAt: null,
              cancellationReason: null,
            },
          });

          await this.recordStatusChange(tx, {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            fromStatus: subscription.status,
            toStatus: SubscriptionStatus.ACTIVE,
            reason: `Renewal charge succeeded (attempt ${nextRetryCount})`,
            metadata: { providerReference },
          });
          return;
        }

        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: {
            retryCount: nextRetryCount,
            lastPaymentAttemptAt: now,
            nextRetryAt:
              !retryExhausted
                ? new Date(now.getTime() + RETRY_WINDOW_MINUTES * 60 * 1000)
                : null,
            status: retryExhausted ? SubscriptionStatus.CANCELLED : SubscriptionStatus.GRACE,
            cancelledAt: retryExhausted ? now : null,
            cancellationReason: retryExhausted
              ? 'Automatic cancellation after renewal retries exhausted'
              : null,
            graceEndsAt: retryExhausted ? null : subscription.graceEndsAt,
          },
        });

        await this.recordStatusChange(tx, {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          fromStatus: subscription.status,
          toStatus: retryExhausted ? SubscriptionStatus.CANCELLED : SubscriptionStatus.GRACE,
          reason: retryExhausted
            ? `Renewal retries exhausted after attempt ${nextRetryCount}`
            : `Renewal retry attempt ${nextRetryCount} failed`,
          metadata: { providerReference, failureMessage },
        });
      });

      processed += 1;
    }

    return {
      processed,
      breakdown: {
        trialActivations: trialActivations.length,
        periodEndCancellations: periodEndCancellations.length,
        graceExpirations: graceExpirations.length,
        periodRenewalGrace: periodRenewalGrace.length,
        retryDue: retryCandidates.length,
      },
    };
  }

  buildGraceEndsAt(from = new Date(), days = DEFAULT_GRACE_DAYS) {
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async transitionSubscription(
    subscription: {
      id: string;
      userId: string;
      status: SubscriptionStatus;
      metadata: Prisma.JsonValue | null;
    },
    toStatus: SubscriptionStatus,
    patch: Prisma.UserSubscriptionUpdateInput & { reason?: string },
  ) {
    const { reason, ...data } = patch;
    await this.prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: toStatus,
          ...data,
        },
      });

      await this.recordStatusChange(tx, {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        fromStatus: subscription.status,
        toStatus,
        reason,
      });
    });
  }

  private calculatePeriodEnd(start: Date, metadata: Prisma.JsonValue | null) {
    const record = this.asRecord(metadata);
    const billingInterval = String(record.billingInterval ?? 'MONTHLY').toUpperCase();
    const end = new Date(start);
    if (billingInterval === 'YEARLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else if (billingInterval === 'QUARTERLY') {
      end.setMonth(end.getMonth() + 3);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringFrom(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return undefined;
  }
}
