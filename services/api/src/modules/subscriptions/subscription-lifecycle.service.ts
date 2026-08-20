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
import { TrialNotificationService } from './trial-notification.service';

const DEFAULT_GRACE_DAYS = 7;
const RETRY_WINDOW_MINUTES = 30;
const CARD_RENEWAL_DISABLED_MESSAGE =
  'Card token renewal is no longer available. Renew through Apple In-App Purchase or Google Play Billing.';

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TrialNotificationService))
    private readonly trialNotificationService: TrialNotificationService,
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
      const isRegistrationTrial =
        subscription.metadata &&
        typeof subscription.metadata === 'object' &&
        !Array.isArray(subscription.metadata) &&
        (subscription.metadata as Record<string, unknown>).isRegistrationTrial === true;

      if (isRegistrationTrial) {
        await this.transitionSubscription(subscription, SubscriptionStatus.EXPIRED, {
          reason: 'Registration trial expired without payment',
          cancelledAt: now,
          graceEndsAt: null,
          nextRetryAt: null,
        });
      } else {
        await this.transitionSubscription(subscription, SubscriptionStatus.ACTIVE, {
          reason: 'Trial period completed',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: this.calculatePeriodEnd(now, subscription.metadata),
        });
      }
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
        storeSubscription: { is: null },
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true } },
        storeSubscription: { select: { id: true } },
      },
    });

    for (const subscription of retryCandidates) {
      if (subscription.storeSubscription) {
        processed += 1;
        continue;
      }

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

      const retryExhausted = nextRetryCount >= subscription.maxRetryCount;

      await this.prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            userId: subscription.userId,
            userSubscriptionId: subscription.id,
            subscriptionPlanId: plan.id,
            provider: PaymentProvider.MANUAL,
            providerReference,
            transactionType: TransactionType.RETRY_CHARGE,
            amount,
            currency,
            status: PaymentStatus.FAILED,
            paidAt: null,
            failedAt: now,
            failureMessage: CARD_RENEWAL_DISABLED_MESSAGE,
            retryable: !retryExhausted,
            retryCount: nextRetryCount,
            nextRetryAt: !retryExhausted
              ? new Date(now.getTime() + RETRY_WINDOW_MINUTES * 60 * 1000)
              : null,
            metadata: {
              purpose: 'SUBSCRIPTION',
              lifecycle: 'retry_due',
              retryAttempt: nextRetryCount,
              billingInterval,
              planCode: plan.code,
            },
          },
        });

        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: {
            retryCount: nextRetryCount,
            lastPaymentAttemptAt: now,
            nextRetryAt: !retryExhausted
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
            : `Card renewal skipped; store billing required (attempt ${nextRetryCount})`,
          metadata: { providerReference, failureMessage: CARD_RENEWAL_DISABLED_MESSAGE },
        });
      });

      processed += 1;
    }

    const trialNotifications = await this.trialNotificationService.processTrialReminders(now);

    return {
      processed,
      trialNotifications,
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
}
