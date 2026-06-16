import { PaymentStatus } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

function createService() {
  const realtimeGateway = {
    getHealthSummary: jest.fn().mockReturnValue({ activeConnections: 3 }),
  };

  const prisma = {
    user: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    paymentTransaction: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    paymentWebhookEvent: {
      count: jest.fn().mockResolvedValue(0),
    },
    userSubscription: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ebook: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ebookPurchase: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    readingProgress: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    empowermentProgram: {
      count: jest.fn().mockResolvedValue(0),
    },
    programEnrollment: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    programProgress: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { completionPct: 0 } }),
    },
    mentorshipClass: {
      count: jest.fn().mockResolvedValue(0),
    },
    mentorshipClassParticipant: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    mentorshipSession: {
      count: jest.fn().mockResolvedValue(0),
    },
    mentorshipFeedback: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 0 } }),
    },
    event: {
      count: jest.fn().mockResolvedValue(0),
    },
    eventAttendee: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    announcement: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    clip: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return {
    service: new AnalyticsService(prisma as never, realtimeGateway as never),
    prisma,
    realtimeGateway,
  };
}

describe('AnalyticsService summary contract', () => {
  it('returns nested data sections expected by admin web', async () => {
    const { service, prisma } = createService();
    prisma.user.count
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(15);
    prisma.notification.count
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(10);
    prisma.paymentTransaction.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(16)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    prisma.userSubscription.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(12);

    const result = await service.getSummary({ from: '2026-01-01', to: '2026-01-31' });

    expect(result.data.engagement).toEqual({
      totalUsers: 120,
      newUsers: 15,
    });
    expect(result.data.notifications).toEqual({
      total: 40,
      unread: 10,
      read: 30,
      readRate: 75,
    });
    expect(result.data.payments.successRate).toBe(80);
    expect(result.data.subscriptions.active).toBe(12);
  });
});

describe('AnalyticsService operational contract', () => {
  it('returns webhook and payment recovery metrics with realtime connections', async () => {
    const { service, prisma, realtimeGateway } = createService();
    prisma.paymentWebhookEvent.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(9);
    prisma.paymentTransaction.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6);

    const result = await service.getOperationalSummary({});

    expect(result.data.webhook).toEqual({
      failed: 2,
      duplicate: 1,
      processed: 9,
    });
    expect(result.data.paymentRecovery).toEqual({
      retrying: 4,
      failed: 6,
    });
    expect(result.data.realtime.activeConnections).toBe(3);
    expect(realtimeGateway.getHealthSummary).toHaveBeenCalled();
  });
});

describe('AnalyticsService report contract', () => {
  it('returns paginated payment rows for payments report', async () => {
    const { service, prisma } = createService();
    prisma.paymentTransaction.findMany.mockResolvedValue([
      { id: 'pay-1', status: PaymentStatus.SUCCESS },
    ]);
    prisma.paymentTransaction.count.mockResolvedValue(1);

    const result = await service.getReport({
      report: 'payments',
      limit: 10,
      offset: 0,
    });

    expect(result).toEqual({
      data: [{ id: 'pay-1', status: PaymentStatus.SUCCESS }],
      total: 1,
      limit: 10,
      offset: 0,
    });
  });
});

describe('AnalyticsService dashboard', () => {
  it('returns KPI and module aggregates', async () => {
    const { service, prisma } = createService();
    prisma.user.count.mockResolvedValueOnce(50);
    prisma.userSubscription.count.mockResolvedValueOnce(12);
    prisma.paymentTransaction.aggregate.mockResolvedValueOnce({
      _sum: { amount: 100 },
    });
    prisma.ebookPurchase.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 25 } })
      .mockResolvedValueOnce({ _sum: { amount: 25 } })
      .mockResolvedValueOnce({ _sum: { amount: 25 } });
    prisma.empowermentProgram.count.mockResolvedValueOnce(4);
    prisma.mentorshipClass.count.mockResolvedValueOnce(3);
    prisma.event.count.mockResolvedValueOnce(2);
    prisma.announcement.count.mockResolvedValueOnce(6);
    prisma.ebook.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
    prisma.ebookPurchase.count.mockResolvedValueOnce(20);
    prisma.readingProgress.count.mockResolvedValueOnce(5);
    prisma.user.count.mockResolvedValueOnce(50).mockResolvedValueOnce(8);
    prisma.notification.count.mockResolvedValueOnce(30).mockResolvedValueOnce(4);
    prisma.userSubscription.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.event.count.mockResolvedValueOnce(5).mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValueOnce(15);
    prisma.empowermentProgram.count.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    prisma.programEnrollment.count.mockResolvedValueOnce(18);
    prisma.programProgress.aggregate.mockResolvedValueOnce({ _avg: { completionPct: 42 } });
    prisma.mentorshipClass.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.mentorshipClassParticipant.count.mockResolvedValueOnce(11);
    prisma.mentorshipSession.count.mockResolvedValueOnce(7);
    prisma.mentorshipFeedback.aggregate.mockResolvedValueOnce({ _avg: { rating: 4.5 } });
    prisma.announcement.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);

    const result = await service.getDashboard({});

    expect(result.data.kpis.totalUsers).toBe(50);
    expect(result.data.kpis.activeSubscriptions).toBe(12);
    expect(result.data.kpis.revenue).toBe(125);
    expect(result.data.kpis.activePrograms).toBe(4);
    expect(result.data.kpis.publishedAnnouncements).toBe(6);
    expect(result.data.modules.programs.activeEnrollments).toBe(18);
    expect(result.data.modules.mentorship.activeParticipants).toBe(11);
  });
});

describe('AnalyticsService growth and activity', () => {
  it('builds growth trend buckets', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([
      { createdAt: new Date('2026-06-01T10:00:00.000Z') },
    ]);
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        amount: 10,
        paidAt: new Date('2026-06-01T12:00:00.000Z'),
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      },
    ]);
    prisma.userSubscription.findMany.mockResolvedValue([]);
    prisma.programEnrollment.findMany.mockResolvedValue([]);
    prisma.mentorshipClassParticipant.findMany.mockResolvedValue([]);
    prisma.eventAttendee.findMany.mockResolvedValue([]);

    const result = await service.getGrowth({
      from: '2026-06-01',
      to: '2026-06-02',
    });

    expect(result.data.users.some((point) => point.value === 1)).toBe(true);
    expect(result.data.revenue.some((point) => point.value === 10)).toBe(true);
  });

  it('merges recent activity items', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        fullName: 'Jane',
        email: 'jane@example.com',
        createdAt: new Date('2026-06-02T10:00:00.000Z'),
      },
    ]);
    prisma.ebookPurchase.findMany.mockResolvedValue([]);
    prisma.programEnrollment.findMany.mockResolvedValue([]);
    prisma.eventAttendee.findMany.mockResolvedValue([]);
    prisma.announcement.findMany.mockResolvedValue([
      {
        id: 'ann-1',
        title: 'Sunday Service',
        publishedAt: new Date('2026-06-02T09:00:00.000Z'),
      },
    ]);

    const result = await service.getActivity({ limit: 5 });

    expect(result.data[0]?.type).toBe('registration');
    expect(result.data.some((item) => item.type === 'announcement')).toBe(true);
  });
});
