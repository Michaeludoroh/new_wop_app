import { Injectable } from '@nestjs/common';
import {
  ContentStatus,
  EventRsvpStatus,
  MentorshipParticipantStatus,
  PaymentStatus,
  ProgramEnrollmentStatus,
  SubscriptionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsReportQueryDto } from './dto/analytics-report-query.dto';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';

type DateWhere = {
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
};

type TrendPoint = { date: string; value: number };

type ActivityItem = {
  id: string;
  type:
    | 'registration'
    | 'purchase'
    | 'enrollment'
    | 'rsvp'
    | 'announcement';
  title: string;
  subtitle: string;
  timestamp: string;
  resourceId: string;
};

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.GRACE,
];

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async getSummary(query: AnalyticsSummaryQueryDto) {
    const dateWhere = this.buildDateWhere(query);
    const sections = await this.buildSummarySections(dateWhere, query.section);

    return { data: sections };
  }

  async getOperationalSummary(query: AnalyticsSummaryQueryDto) {
    const dateWhere = this.buildDateWhere(query);

    const [
      webhookFailed,
      webhookDuplicate,
      webhookProcessed,
      retryingPayments,
      failedPayments,
    ] = await Promise.all([
      this.prisma.paymentWebhookEvent.count({
        where: {
          ...dateWhere,
          processingStatus: WebhookProcessingStatus.FAILED,
        },
      }),
      this.prisma.paymentWebhookEvent.count({
        where: {
          ...dateWhere,
          processingStatus: WebhookProcessingStatus.DUPLICATE,
        },
      }),
      this.prisma.paymentWebhookEvent.count({
        where: {
          ...dateWhere,
          processingStatus: WebhookProcessingStatus.PROCESSED,
        },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          ...dateWhere,
          retryable: true,
          status: PaymentStatus.PENDING,
          nextRetryAt: { not: null },
        },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          ...dateWhere,
          status: PaymentStatus.FAILED,
        },
      }),
    ]);

    const realtimeHealth = this.realtimeGateway.getHealthSummary();

    return {
      data: {
        webhook: {
          failed: webhookFailed,
          duplicate: webhookDuplicate,
          processed: webhookProcessed,
        },
        paymentRecovery: {
          retrying: retryingPayments,
          failed: failedPayments,
        },
        realtime: {
          activeConnections: realtimeHealth.activeConnections,
        },
      },
    };
  }

  async getReport(query: AnalyticsReportQueryDto) {
    const dateWhere = this.buildDateWhere(query);
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = query.offset ?? 0;

    switch (query.report) {
      case 'payments': {
        const where = dateWhere;
        const [rows, total] = await Promise.all([
          this.prisma.paymentTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.paymentTransaction.count({ where }),
        ]);
        return { data: rows, total, limit, offset };
      }
      case 'subscriptions': {
        const [rows, total] = await Promise.all([
          this.prisma.userSubscription.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.userSubscription.count(),
        ]);
        return { data: rows, total, limit, offset };
      }
      case 'users': {
        const where = { deletedAt: null as null, ...dateWhere };
        const [rows, total] = await Promise.all([
          this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              createdAt: true,
            },
          }),
          this.prisma.user.count({ where }),
        ]);
        return { data: rows, total, limit, offset };
      }
      case 'notifications': {
        const where = { deletedAt: null as null, ...dateWhere };
        const [rows, total] = await Promise.all([
          this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.notification.count({ where }),
        ]);
        return { data: rows, total, limit, offset };
      }
      default:
        return { data: [], total: 0, limit, offset };
    }
  }

  async getDashboard(query: AnalyticsQueryDto) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubscriptions,
      paymentRevenue,
      ebookRevenue,
      activePrograms,
      activeMentorshipClasses,
      upcomingEvents,
      publishedAnnouncements,
      libraryTotals,
      moduleStats,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.userSubscription.count({
        where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.ebookPurchase.aggregate({ _sum: { amount: true } }),
      this.prisma.empowermentProgram.count({
        where: { deletedAt: null, published: true },
      }),
      this.prisma.mentorshipClass.count({
        where: { deletedAt: null, published: true },
      }),
      this.prisma.event.count({
        where: { published: true, startDateTime: { gte: now } },
      }),
      this.prisma.announcement.count({
        where: {
          deletedAt: null,
          status: ContentStatus.PUBLISHED,
        },
      }),
      this.getLibraryTotals(sevenDaysAgo),
      this.getModuleAggregates(now, sevenDaysAgo),
    ]);

    const revenue =
      Number(paymentRevenue._sum.amount ?? 0) + Number(ebookRevenue._sum.amount ?? 0);

    return {
      data: {
        kpis: {
          totalUsers,
          activeSubscriptions,
          revenue,
          activePrograms,
          activeMentorshipClasses,
          upcomingEvents,
          publishedAnnouncements,
          library: libraryTotals,
        },
        modules: moduleStats,
      },
    };
  }

  async getGrowth(query: AnalyticsQueryDto) {
    const range = this.resolveTrendRange(query);
    const dateWhere = this.buildDateWhere(query);
    const bucketKeys = this.buildBucketKeys(range.from, range.to, query.granularity ?? 'day');

    const [
      users,
      payments,
      subscriptions,
      enrollments,
      mentorshipParticipants,
      eventRegistrations,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null, ...dateWhere },
        select: { createdAt: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          ...dateWhere,
        },
        select: { amount: true, paidAt: true, createdAt: true },
      }),
      this.prisma.userSubscription.findMany({
        where: dateWhere,
        select: { createdAt: true },
      }),
      this.prisma.programEnrollment.findMany({
        where: {
          status: ProgramEnrollmentStatus.ENROLLED,
          ...dateWhere,
        },
        select: { createdAt: true },
      }),
      this.prisma.mentorshipClassParticipant.findMany({
        where: dateWhere,
        select: { createdAt: true },
      }),
      this.prisma.eventAttendee.findMany({
        where: {
          status: EventRsvpStatus.REGISTERED,
          ...dateWhere,
        },
        select: { registeredAt: true },
      }),
    ]);

    return {
      data: {
        revenue: this.bucketSum(
          bucketKeys,
          payments.map((row) => ({
            at: row.paidAt ?? row.createdAt,
            amount: Number(row.amount),
          })),
        ),
        users: this.bucketCount(
          bucketKeys,
          users.map((row) => row.createdAt),
        ),
        subscriptions: this.bucketCount(
          bucketKeys,
          subscriptions.map((row) => row.createdAt),
        ),
        programEnrollments: this.bucketCount(
          bucketKeys,
          enrollments.map((row) => row.createdAt),
        ),
        mentorshipParticipants: this.bucketCount(
          bucketKeys,
          mentorshipParticipants.map((row) => row.createdAt),
        ),
        eventRegistrations: this.bucketCount(
          bucketKeys,
          eventRegistrations.map((row) => row.registeredAt),
        ),
      },
    };
  }

  async getActivity(query: AnalyticsQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const dateWhere = this.buildDateWhere(query);

    const [users, purchases, enrollments, rsvps, announcements] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { deletedAt: null, ...dateWhere },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        }),
        this.prisma.ebookPurchase.findMany({
          where: this.purchasedAtWhere(dateWhere),
          orderBy: { purchasedAt: 'desc' },
          take: limit,
          include: {
            ebook: { select: { title: true } },
            user: { select: { fullName: true, email: true } },
          },
        }),
        this.prisma.programEnrollment.findMany({
          where: {
            status: ProgramEnrollmentStatus.ENROLLED,
            ...dateWhere,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            program: { select: { title: true } },
            user: { select: { fullName: true, email: true } },
          },
        }),
        this.prisma.eventAttendee.findMany({
          where: {
            status: EventRsvpStatus.REGISTERED,
            ...dateWhere,
          },
          orderBy: { registeredAt: 'desc' },
          take: limit,
          include: {
            event: { select: { title: true } },
            user: { select: { fullName: true, email: true } },
          },
        }),
        this.prisma.announcement.findMany({
          where: {
            deletedAt: null,
            status: ContentStatus.PUBLISHED,
            publishedAt: { not: null },
            ...(dateWhere.createdAt ? { publishedAt: dateWhere.createdAt } : {}),
          },
          orderBy: { publishedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            publishedAt: true,
          },
        }),
      ]);

    const items: ActivityItem[] = [
      ...users.map((user) => ({
        id: `registration:${user.id}`,
        type: 'registration' as const,
        title: user.fullName || user.email,
        subtitle: 'New user registration',
        timestamp: user.createdAt.toISOString(),
        resourceId: user.id,
      })),
      ...purchases.map((purchase) => ({
        id: `purchase:${purchase.id}`,
        type: 'purchase' as const,
        title: purchase.ebook.title,
        subtitle: `Purchased by ${purchase.user.fullName || purchase.user.email}`,
        timestamp: purchase.purchasedAt.toISOString(),
        resourceId: purchase.id,
      })),
      ...enrollments.map((enrollment) => ({
        id: `enrollment:${enrollment.id}`,
        type: 'enrollment' as const,
        title: enrollment.program.title,
        subtitle: `Enrolled: ${enrollment.user.fullName || enrollment.user.email}`,
        timestamp: enrollment.createdAt.toISOString(),
        resourceId: enrollment.id,
      })),
      ...rsvps.map((rsvp) => ({
        id: `rsvp:${rsvp.id}`,
        type: 'rsvp' as const,
        title: rsvp.event.title,
        subtitle: `RSVP: ${rsvp.user.fullName || rsvp.user.email}`,
        timestamp: rsvp.registeredAt.toISOString(),
        resourceId: rsvp.id,
      })),
      ...announcements.map((announcement) => ({
        id: `announcement:${announcement.id}`,
        type: 'announcement' as const,
        title: announcement.title,
        subtitle: 'Announcement published',
        timestamp: (announcement.publishedAt ?? new Date()).toISOString(),
        resourceId: announcement.id,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);

    return { data: items };
  }

  async getTopContent(query: AnalyticsQueryDto) {
    const ebookLimit = Math.min(query.limit ?? 5, 20);

    const [topPurchased, topReading, topClips] = await Promise.all([
      this.prisma.ebookPurchase.groupBy({
        by: ['ebookId'],
        _count: { ebookId: true },
        orderBy: { _count: { ebookId: 'desc' } },
        take: ebookLimit,
      }),
      this.prisma.readingProgress.groupBy({
        by: ['ebookId'],
        _count: { ebookId: true },
        orderBy: { _count: { ebookId: 'desc' } },
        take: ebookLimit,
      }),
      this.prisma.clip.findMany({
        where: { deletedAt: null, status: ContentStatus.PUBLISHED },
        orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        take: ebookLimit,
        select: {
          id: true,
          title: true,
          viewCount: true,
          category: true,
        },
      }),
    ]);

    const ebookIds = [
      ...new Set([
        ...topPurchased.map((row) => row.ebookId),
        ...topReading.map((row) => row.ebookId),
      ]),
    ];

    const ebooks = ebookIds.length
      ? await this.prisma.ebook.findMany({
          where: { id: { in: ebookIds } },
          select: { id: true, title: true },
        })
      : [];

    const titleById = new Map(ebooks.map((ebook) => [ebook.id, ebook.title]));
    const purchaseCountById = new Map(
      topPurchased.map((row) => [row.ebookId, row._count.ebookId]),
    );
    const readerCountById = new Map(
      topReading.map((row) => [row.ebookId, row._count.ebookId]),
    );

    const mergedEbookIds = [
      ...new Set([...purchaseCountById.keys(), ...readerCountById.keys()]),
    ]
      .sort((a, b) => {
        const scoreA =
          (purchaseCountById.get(a) ?? 0) * 2 + (readerCountById.get(a) ?? 0);
        const scoreB =
          (purchaseCountById.get(b) ?? 0) * 2 + (readerCountById.get(b) ?? 0);
        return scoreB - scoreA;
      })
      .slice(0, ebookLimit);

    return {
      data: {
        ebooks: mergedEbookIds.map((id) => ({
          id,
          title: titleById.get(id) ?? 'Unknown eBook',
          purchases: purchaseCountById.get(id) ?? 0,
          readers: readerCountById.get(id) ?? 0,
        })),
        clips: topClips.map((clip) => ({
          id: clip.id,
          title: clip.title,
          viewCount: clip.viewCount,
          category: clip.category,
        })),
      },
    };
  }

  private async buildSummarySections(
    dateWhere: DateWhere,
    section?: AnalyticsSummaryQueryDto['section'],
  ) {
    const includeAll = !section || section === 'overview';

    const engagement =
      includeAll || section === 'engagement'
        ? await this.getEngagementMetrics(dateWhere)
        : undefined;
    const notifications =
      includeAll || section === 'notifications'
        ? await this.getNotificationMetrics(dateWhere)
        : undefined;
    const payments =
      includeAll || section === 'payments'
        ? await this.getPaymentMetrics(dateWhere)
        : undefined;
    const subscriptions =
      includeAll || section === 'subscriptions'
        ? await this.getSubscriptionMetrics()
        : undefined;
    const operational =
      includeAll || section === 'operational'
        ? await this.getOperationalMetrics(dateWhere)
        : undefined;

    return {
      engagement: engagement ?? {
        totalUsers: 0,
        newUsers: 0,
      },
      notifications: notifications ?? {
        total: 0,
        unread: 0,
        read: 0,
        readRate: 0,
      },
      payments: payments ?? {
        total: 0,
        succeeded: 0,
        failed: 0,
        retrying: 0,
        recovered: 0,
        successRate: 0,
      },
      subscriptions: subscriptions ?? {
        active: 0,
        trialing: 0,
        cancelled: 0,
        pastDue: 0,
        conversionRate: 0,
      },
      operational: operational ?? {
        retryRecoveryCount: 0,
        retryingPayments: 0,
        failedPayments: 0,
        activeSubscriptionSummaries: 0,
      },
    };
  }

  private async getEngagementMetrics(dateWhere: DateWhere) {
    const [totalUsers, newUsers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, ...dateWhere },
      }),
    ]);

    return { totalUsers, newUsers };
  }

  private async getNotificationMetrics(dateWhere: DateWhere) {
    const where = { deletedAt: null as null, ...dateWhere };
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    const read = Math.max(total - unread, 0);
    const readRate = total > 0 ? Math.round((read / total) * 1000) / 10 : 0;

    return { total, unread, read, readRate };
  }

  private async getPaymentMetrics(dateWhere: DateWhere) {
    const where = dateWhere;
    const [total, succeeded, failed, retrying, recovered] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.count({
        where: { ...where, status: PaymentStatus.SUCCESS },
      }),
      this.prisma.paymentTransaction.count({
        where: { ...where, status: PaymentStatus.FAILED },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          ...where,
          retryable: true,
          status: PaymentStatus.PENDING,
          nextRetryAt: { not: null },
        },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          ...where,
          status: PaymentStatus.SUCCESS,
          retryCount: { gt: 0 },
        },
      }),
    ]);

    const successRate =
      total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0;

    return { total, succeeded, failed, retrying, recovered, successRate };
  }

  private async getSubscriptionMetrics() {
    const now = new Date();
    const [active, grace, cancelled, trialing] = await Promise.all([
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.GRACE },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.CANCELLED },
      }),
      this.prisma.userSubscription.count({
        where: {
          trialEndsAt: { gt: now },
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING],
          },
        },
      }),
    ]);

    const conversionDenominator = active + cancelled;
    const conversionRate =
      conversionDenominator > 0
        ? Math.round((active / conversionDenominator) * 1000) / 10
        : 0;

    return {
      active: active + grace,
      trialing,
      cancelled,
      pastDue: grace,
      conversionRate,
    };
  }

  private async getOperationalMetrics(dateWhere: DateWhere) {
    const [retryRecoveryCount, retryingPayments, failedPayments, activeSummaries] =
      await Promise.all([
        this.prisma.paymentTransaction.count({
          where: {
            ...dateWhere,
            status: PaymentStatus.SUCCESS,
            retryCount: { gt: 0 },
          },
        }),
        this.prisma.paymentTransaction.count({
          where: {
            ...dateWhere,
            retryable: true,
            status: PaymentStatus.PENDING,
            nextRetryAt: { not: null },
          },
        }),
        this.prisma.paymentTransaction.count({
          where: { ...dateWhere, status: PaymentStatus.FAILED },
        }),
        this.prisma.userSubscription.count({
          where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
        }),
      ]);

    return {
      retryRecoveryCount,
      retryingPayments,
      failedPayments,
      activeSubscriptionSummaries: activeSummaries,
    };
  }

  private async getLibraryTotals(sevenDaysAgo: Date) {
    const [
      ebooks,
      published,
      purchases,
      activeReaders,
      revenue,
    ] = await Promise.all([
      this.prisma.ebook.count({ where: { deletedAt: null } }),
      this.prisma.ebook.count({
        where: { deletedAt: null, status: ContentStatus.PUBLISHED },
      }),
      this.prisma.ebookPurchase.count(),
      this.prisma.readingProgress.count({
        where: { lastReadAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.ebookPurchase.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      ebooks,
      published,
      purchases,
      activeReaders,
      revenue: Number(revenue._sum.amount ?? 0),
    };
  }

  private async getModuleAggregates(now: Date, sevenDaysAgo: Date) {
    const [
      users,
      subscriptions,
      ebooks,
      events,
      programs,
      mentorship,
      notifications,
      announcements,
    ] = await Promise.all([
      this.getEngagementMetrics({}),
      this.getSubscriptionMetrics(),
      this.getLibraryTotals(sevenDaysAgo),
      this.getEventStats(now),
      this.getProgramStats(),
      this.getMentorshipStats(),
      this.getNotificationMetrics({}),
      this.getAnnouncementStats(),
    ]);

    const [paymentRevenue, ebookRevenue] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.ebookPurchase.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      users,
      subscriptions,
      revenue: {
        total:
          Number(paymentRevenue._sum.amount ?? 0) +
          Number(ebookRevenue._sum.amount ?? 0),
        payments: Number(paymentRevenue._sum.amount ?? 0),
        ebookPurchases: Number(ebookRevenue._sum.amount ?? 0),
      },
      ebooks,
      events,
      programs,
      mentorship,
      notifications,
      announcements,
    };
  }

  private async getEventStats(now: Date) {
    const [total, published, upcoming, registrations] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { published: true } }),
      this.prisma.event.count({
        where: { published: true, startDateTime: { gte: now } },
      }),
      this.prisma.eventAttendee.count({
        where: { status: EventRsvpStatus.REGISTERED },
      }),
    ]);

    return { total, published, upcoming, registrations };
  }

  private async getProgramStats() {
    const [
      totalPrograms,
      publishedPrograms,
      activeEnrollments,
      avgCompletion,
    ] = await Promise.all([
      this.prisma.empowermentProgram.count({ where: { deletedAt: null } }),
      this.prisma.empowermentProgram.count({
        where: { deletedAt: null, published: true },
      }),
      this.prisma.programEnrollment.count({
        where: { status: ProgramEnrollmentStatus.ENROLLED },
      }),
      this.prisma.programProgress.aggregate({ _avg: { completionPct: true } }),
    ]);

    return {
      totalPrograms,
      publishedPrograms,
      activeEnrollments,
      averageCompletionPct: avgCompletion._avg.completionPct ?? 0,
    };
  }

  private async getMentorshipStats() {
    const [
      totalClasses,
      publishedClasses,
      activeParticipants,
      totalSessions,
      avgRating,
    ] = await Promise.all([
      this.prisma.mentorshipClass.count({ where: { deletedAt: null } }),
      this.prisma.mentorshipClass.count({
        where: { deletedAt: null, published: true },
      }),
      this.prisma.mentorshipClassParticipant.count({
        where: { status: MentorshipParticipantStatus.ENROLLED },
      }),
      this.prisma.mentorshipSession.count(),
      this.prisma.mentorshipFeedback.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      totalClasses,
      publishedClasses,
      activeParticipants,
      totalSessions,
      averageRating: avgRating._avg.rating ?? 0,
    };
  }

  private async getAnnouncementStats() {
    const [total, published, draft, pushSent] = await Promise.all([
      this.prisma.announcement.count({ where: { deletedAt: null } }),
      this.prisma.announcement.count({
        where: { deletedAt: null, status: ContentStatus.PUBLISHED },
      }),
      this.prisma.announcement.count({
        where: { deletedAt: null, status: ContentStatus.DRAFT },
      }),
      this.prisma.announcement.count({
        where: { deletedAt: null, pushNotificationSent: true },
      }),
    ]);

    return { total, published, draft, pushSent };
  }

  private purchasedAtWhere(dateWhere: DateWhere) {
    if (!dateWhere.createdAt) {
      return {};
    }

    return { purchasedAt: dateWhere.createdAt };
  }

  private resolveTrendRange(query: AnalyticsQueryDto) {
    const to =
      query.to && !Number.isNaN(Date.parse(query.to))
        ? new Date(query.to)
        : new Date();
    const from =
      query.from && !Number.isNaN(Date.parse(query.from))
        ? new Date(query.from)
        : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    return { from, to };
  }

  private buildBucketKeys(
    from: Date,
    to: Date,
    granularity: 'day' | 'week' | 'month',
  ) {
    const keys: string[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= to) {
      keys.push(this.formatBucketKey(cursor, granularity));
      if (granularity === 'month') {
        cursor.setMonth(cursor.getMonth() + 1);
      } else if (granularity === 'week') {
        cursor.setDate(cursor.getDate() + 7);
      } else {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return keys;
  }

  private formatBucketKey(date: Date, granularity: 'day' | 'week' | 'month') {
    if (granularity === 'month') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (granularity === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }

  private bucketCount(bucketKeys: string[], timestamps: Date[]) {
    const counts = new Map(bucketKeys.map((key) => [key, 0]));
    for (const timestamp of timestamps) {
      const key = timestamp.toISOString().slice(0, 10);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return bucketKeys.map((date) => ({
      date,
      value: counts.get(date) ?? 0,
    }));
  }

  private bucketSum(
    bucketKeys: string[],
    rows: Array<{ at: Date; amount: number }>,
  ): TrendPoint[] {
    const totals = new Map(bucketKeys.map((key) => [key, 0]));
    for (const row of rows) {
      const key = row.at.toISOString().slice(0, 10);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + row.amount);
      }
    }
    return bucketKeys.map((date) => ({
      date,
      value: Math.round((totals.get(date) ?? 0) * 100) / 100,
    }));
  }

  private buildDateWhere(
    query:
      | AnalyticsSummaryQueryDto
      | AnalyticsReportQueryDto
      | AnalyticsQueryDto,
  ): DateWhere {
    const from =
      query.from && !Number.isNaN(Date.parse(query.from))
        ? new Date(query.from)
        : undefined;
    const to =
      query.to && !Number.isNaN(Date.parse(query.to))
        ? new Date(query.to)
        : undefined;

    if (!from && !to) {
      return {};
    }

    return {
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    };
  }
}
