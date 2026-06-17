import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

const DEFAULT_GRACE_DAYS = 7;
const RETRY_WINDOW_MINUTES = 30;

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
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
        nextRetryAt: new Date(now.getTime() + RETRY_WINDOW_MINUTES * 60 * 1000),
      });
      processed += 1;
    }

    const retryCandidates = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.GRACE,
        nextRetryAt: { lte: now },
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
      const renewal = await this.paymentsService.initiateSubscriptionRenewalCharge({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        retryAttempt: nextRetryCount,
        maxRetryCount: subscription.maxRetryCount,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: {
            retryCount: nextRetryCount,
            lastPaymentAttemptAt: now,
            nextRetryAt:
              renewal.status === PaymentStatus.SUCCESS
                ? null
                : nextRetryCount < subscription.maxRetryCount
                  ? new Date(now.getTime() + RETRY_WINDOW_MINUTES * 60 * 1000)
                  : null,
          },
        });

        await this.recordStatusChange(tx, {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          fromStatus: subscription.status,
          toStatus:
            renewal.status === PaymentStatus.SUCCESS
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.GRACE,
          reason:
            renewal.status === PaymentStatus.SUCCESS
              ? `Renewal retry attempt ${nextRetryCount} succeeded`
              : `Renewal retry attempt ${nextRetryCount} ${renewal.charged ? 'processed' : 'scheduled'}`,
          metadata: {
            providerReference: renewal.providerReference,
            charged: renewal.charged,
            status: renewal.status,
          },
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
    const record =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
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
}
