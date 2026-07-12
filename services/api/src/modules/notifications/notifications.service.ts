import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { ObservabilityService } from '../../observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PushService } from '../push/push.service';
import { PushMessage } from '../push/push.providers/push-provider.interface';
import { buildPushData, PushDeepLinkInput, PushEntityType } from '../push/push-deep-link.util';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { CreateBroadcastNotificationDto } from './dto/create-broadcast-notification.dto';
import { CreateTargetedNotificationDto } from './dto/create-targeted-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { RequestUser } from './dto/notification-request.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly observability: ObservabilityService,
  ) {}

  private extractDeepLink(input: {
    entityType?: string;
    entityId?: string;
    route?: string;
    metadata?: Record<string, unknown>;
  }): PushDeepLinkInput | undefined {
    const entityType =
      input.entityType ?? (typeof input.metadata?.entityType === 'string' ? input.metadata.entityType : undefined);
    const entityId =
      input.entityId ?? (typeof input.metadata?.entityId === 'string' ? input.metadata.entityId : undefined);
    const route =
      input.route ?? (typeof input.metadata?.route === 'string' ? input.metadata.route : undefined);

    if (!entityType && !entityId && !route) {
      return undefined;
    }

    return { entityType, entityId, route };
  }

  private buildPushMessage(
    notification: {
      id: string;
      title: string;
      body: string;
      createdAt: Date;
    },
    channel: 'PUSH',
    deepLink?: PushDeepLinkInput,
  ): PushMessage {
    return {
      dedupeKey: `notification.created:${notification.id}`,
      category: 'NOTIFICATION',
      title: notification.title,
      body: notification.body,
      data: buildPushData(
        {
          notificationId: notification.id,
          channel,
          createdAt: notification.createdAt.toISOString(),
        },
        deepLink,
      ),
    };
  }

  private async dispatchChannelDelivery(
    channel: 'IN_APP' | 'EMAIL' | 'PUSH',
    notification: {
      id: string;
      userId: string | null;
      title: string;
      body: string;
      createdAt: Date;
    },
    deepLink?: PushDeepLinkInput,
  ) {
    if (channel === 'PUSH') {
      const message = this.buildPushMessage(notification, channel, deepLink);

      if (notification.userId) {
        this.logger.log(
          `Targeted push dispatch notificationId=${notification.id} userId=${notification.userId}`,
        );
        await this.pushService.sendToUser(notification.userId, message);
        return;
      }

      this.logger.log(`Broadcast push dispatch notificationId=${notification.id}`);
      const result = await this.pushService.sendBroadcast(message);
      const dispatchStats = result.data as
        | { attempts?: number; success?: number; failed?: number }
        | undefined;
      this.logger.log(
        `Broadcast push completed notificationId=${notification.id} attempts=${dispatchStats?.attempts ?? 0} success=${dispatchStats?.success ?? 0} failed=${dispatchStats?.failed ?? 0}`,
      );
      return;
    }

    if (channel === 'EMAIL') {
      if (notification.userId) {
        const recipient = await this.prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true },
        });

        if (!recipient?.email) {
          this.observability.recordNotificationFailure(channel, 'email_recipient_missing');
          return;
        }

        const content = this.emailTemplateService.adminNotificationEmail(
          notification.title,
          notification.body,
        );

        await this.emailService.send([
          {
            to: recipient.email,
            subject: content.subject,
            body: content.body,
            html: content.html,
            dedupeKey: `notification.created:${notification.id}:email:${recipient.email}`,
            metadata: {
              notificationId: notification.id,
              channel,
              scope: 'targeted',
            },
          },
        ]);
        return;
      }

      const recipients = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { email: true },
        take: 200,
      });

      const content = this.emailTemplateService.adminNotificationEmail(
        notification.title,
        notification.body,
      );

      const messages = recipients
        .filter((recipient) => Boolean(recipient.email))
        .map((recipient) => ({
          to: recipient.email!,
          subject: content.subject,
          body: content.body,
          html: content.html,
          dedupeKey: `notification.created:${notification.id}:email:${recipient.email}`,
          metadata: {
            notificationId: notification.id,
            channel,
            scope: 'broadcast',
          },
        }));

      await this.emailService.send(messages);
    }
  }

  private isAdmin(role: RequestUser['role']) {
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  }

  async listForUser(user: RequestUser, query: ListNotificationsQueryDto) {
    const where = {
      deletedAt: null as null,
      OR: this.isAdmin(user.role)
        ? [{ userId: null }, { userId: user.sub }]
        : [{ userId: null }, { userId: user.sub }],
      ...(typeof query.isRead === 'boolean' ? { isRead: query.isRead } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
  }

  async findOneForUser(user: RequestUser, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const isOwner = notification.userId === user.sub;
    const isBroadcast = notification.userId === null;

    if (!isOwner && !isBroadcast && !this.isAdmin(user.role)) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return notification;
  }

  async createBroadcast(user: RequestUser, dto: CreateBroadcastNotificationDto) {
    if (!this.isAdmin(user.role)) {
      throw new ForbiddenException('Only admins can create broadcast notifications');
    }

    this.logger.log(
      `Broadcast notification request received channel=${dto.channel} title="${dto.title}" adminId=${user.sub}`,
    );

    const created = await this.prisma.notification.create({
      data: {
        userId: null,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
      },
    });

    this.realtimeService.emitNotificationCreated({
      id: created.id,
      userId: created.userId,
      title: created.title,
      body: created.body,
      channel: created.channel,
      isRead: created.isRead,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });

    try {
      await this.dispatchChannelDelivery(
        created.channel,
        {
          id: created.id,
          userId: created.userId,
          title: created.title,
          body: created.body,
          createdAt: created.createdAt,
        },
        this.extractDeepLink(dto),
      );
    } catch (error) {
      this.observability.recordNotificationFailure(
        created.channel,
        'notification_channel_delivery_failed_broadcast',
      );
      Sentry.captureException(error);
    }

    return created;
  }

  async createTargeted(user: RequestUser, dto: CreateTargetedNotificationDto) {
    if (!this.isAdmin(user.role) && dto.userId !== user.sub) {
      throw new ForbiddenException('Cannot create targeted notifications for other users');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    if (
      !this.isAdmin(user.role) &&
      recipient.role !== Role.USER &&
      recipient.id !== user.sub
    ) {
      throw new ForbiddenException('Insufficient permission for targeted recipient');
    }

    const created = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
      },
    });

    this.realtimeService.emitNotificationCreated({
      id: created.id,
      userId: created.userId,
      title: created.title,
      body: created.body,
      channel: created.channel,
      isRead: created.isRead,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });

    try {
      await this.dispatchChannelDelivery(
        created.channel,
        {
          id: created.id,
          userId: created.userId,
          title: created.title,
          body: created.body,
          createdAt: created.createdAt,
        },
        this.extractDeepLink(dto),
      );
    } catch (error) {
      this.observability.recordNotificationFailure(
        created.channel,
        'notification_channel_delivery_failed_targeted',
      );
      Sentry.captureException(error);
    }

    return created;
  }

  async markReadState(user: RequestUser, id: string, isRead: boolean) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const isOwner = notification.userId === user.sub;
    const isBroadcast = notification.userId === null;

    if (!isOwner && !isBroadcast && !this.isAdmin(user.role)) {
      throw new ForbiddenException('You do not have permission to modify this notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead },
    });

    this.realtimeService.emitNotificationReadStateChanged({
      id: updated.id,
      userId: updated.userId,
      isRead: updated.isRead,
      updatedAt: updated.updatedAt.toISOString(),
    });

    this.realtimeService.emitNotificationUpdated({
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      body: updated.body,
      channel: updated.channel,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  async deliverPublishedAnnouncement(announcement: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date | null;
    pushNotificationSent: boolean;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        announcementId: announcement.id,
        deletedAt: null,
      },
    });

    const notification =
      existing ??
      (await this.prisma.notification.create({
        data: {
          userId: null,
          announcementId: announcement.id,
          title: announcement.title,
          body: announcement.body,
          channel: 'IN_APP',
        },
      }));

    this.realtimeService.emitAnnouncementPublished({
      id: announcement.id,
      title: announcement.title,
      content: announcement.body,
      publishedAt: (announcement.publishedAt ?? new Date()).toISOString(),
      notificationId: notification.id,
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

    if (!announcement.pushNotificationSent) {
      await this.pushService.sendBroadcast({
        dedupeKey: `announcement.published:${announcement.id}`,
        category: 'NOTIFICATION',
        title: announcement.title,
        body: announcement.body,
        data: buildPushData(
          {
            announcementId: announcement.id,
            notificationId: notification.id,
            type: 'announcement.published',
          },
          {
            entityType: PushEntityType.ANNOUNCEMENT,
            entityId: announcement.id,
          },
        ),
      });

      await this.prisma.announcement.update({
        where: { id: announcement.id },
        data: { pushNotificationSent: true },
      });
    }

    return { data: notification, duplicate: Boolean(existing) };
  }
}
