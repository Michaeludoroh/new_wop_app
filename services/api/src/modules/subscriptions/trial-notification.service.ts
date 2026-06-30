import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  asSubscriptionMetadata,
  isRegistrationTrial,
  isTrialActive,
  trialDaysRemaining,
} from './subscription-access.util';

type TrialSubscription = {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  metadata: Prisma.JsonValue | null;
};

@Injectable()
export class TrialNotificationService {
  private readonly logger = new Logger(TrialNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async processTrialReminders(now = new Date()) {
    const activeTrials = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.PENDING,
        trialEndsAt: { not: null },
      },
    });

    let sent = 0;

    for (const subscription of activeTrials) {
      if (!isTrialActive(subscription, now) || !subscription.trialEndsAt) {
        if (
          subscription.trialEndsAt &&
          subscription.trialEndsAt.getTime() <= now.getTime() &&
          isRegistrationTrial(subscription)
        ) {
          sent += await this.sendExpiredReminder(subscription, now);
        }
        continue;
      }

      const daysRemaining = trialDaysRemaining(subscription, now);
      if (daysRemaining === 3) {
        sent += await this.sendReminder(subscription, 'three_days', now);
      } else if (daysRemaining === 1) {
        sent += await this.sendReminder(subscription, 'one_day', now);
      }
    }

    return { sent };
  }

  private async sendReminder(
    subscription: TrialSubscription,
    stage: 'three_days' | 'one_day',
    now: Date,
  ) {
    const metadata = asSubscriptionMetadata(subscription.metadata);
    const sentKey = `trialReminder${stage === 'three_days' ? 'ThreeDays' : 'OneDay'}At`;
    if (metadata[sentKey]) {
      return 0;
    }

    const daysLabel = stage === 'three_days' ? '3 days' : '1 day';
    const title = 'Free trial ending soon';
    const body = `Your WOPP free trial ends in ${daysLabel}. Subscribe for only ₦500/month to keep premium access.`;

    await this.dispatch(subscription.userId, title, body, `trial:${stage}:${subscription.id}`, now);

    await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        metadata: {
          ...metadata,
          [sentKey]: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return 1;
  }

  private async sendExpiredReminder(subscription: TrialSubscription, now: Date) {
    const metadata = asSubscriptionMetadata(subscription.metadata);
    if (metadata.trialExpiredReminderAt) {
      return 0;
    }

    const title = 'Your free trial has ended';
    const body = 'Subscribe for only ₦500/month to continue using WOPP premium content.';

    await this.dispatch(subscription.userId, title, body, `trial:expired:${subscription.id}`, now);

    await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        metadata: {
          ...metadata,
          trialExpiredReminderAt: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return 1;
  }

  private async dispatch(userId: string, title: string, body: string, dedupeKey: string, now: Date) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          body,
          channel: 'IN_APP',
        },
      });

      this.realtimeService.emitNotificationCreated({
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        channel: notification.channel,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        updatedAt: notification.updatedAt.toISOString(),
      });

      await this.pushService.sendToUser(userId, {
        dedupeKey,
        category: 'SUBSCRIPTION',
        title,
        body,
        data: {
          route: '/subscriptions',
          category: 'SUBSCRIPTION',
          notificationId: notification.id,
          createdAt: now.toISOString(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send trial notification to ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
