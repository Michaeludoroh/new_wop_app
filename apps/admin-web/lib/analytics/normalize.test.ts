import { describe, expect, it } from "vitest";
import {
  normalizeActivityResponse,
  normalizeDashboardResponse,
  normalizeOperationalResponse,
  normalizeReportResponse,
  normalizeSummaryResponse
} from "./normalize";

describe("analytics response normalization", () => {
  it("unwraps nested summary data for admin widgets", () => {
    const normalized = normalizeSummaryResponse({
      data: {
        engagement: { totalUsers: 100, newUsers: 12 },
        notifications: { total: 40, unread: 10, read: 30, readRate: 75 },
        payments: {
          total: 20,
          succeeded: 16,
          failed: 4,
          retrying: 2,
          recovered: 1,
          successRate: 80
        },
        subscriptions: {
          active: 10,
          trialing: 2,
          cancelled: 3,
          pastDue: 1,
          conversionRate: 76.9
        },
        operational: {
          retryRecoveryCount: 1,
          retryingPayments: 2,
          failedPayments: 4,
          activeSubscriptionSummaries: 10
        }
      }
    });

    expect(normalized?.engagement.totalUsers).toBe(100);
    expect(normalized?.payments.successRate).toBe(80);
  });

  it("maps legacy flat summary payloads", () => {
    const normalized = normalizeSummaryResponse({
      users: 55,
      payments: { success: 8, failed: 2, pending: 1 },
      subscriptions: { active: 4, grace: 1, cancelled: 2 }
    });

    expect(normalized?.engagement.totalUsers).toBe(55);
    expect(normalized?.payments.succeeded).toBe(8);
    expect(normalized?.subscriptions.active).toBe(4);
    expect(normalized?.subscriptions.pastDue).toBe(1);
  });

  it("normalizes operational webhook metrics", () => {
    const normalized = normalizeOperationalResponse({
      data: {
        webhook: { failed: 2, duplicate: 1, processed: 9 },
        paymentRecovery: { retrying: 4, failed: 6 },
        realtime: { activeConnections: 3 }
      }
    });

    expect(normalized?.webhook.processed).toBe(9);
    expect(normalized?.realtime?.activeConnections).toBe(3);
  });

  it("normalizes paginated report payloads", () => {
    const normalized = normalizeReportResponse<{ id: string }>({
      data: [{ id: "pay-1" }],
      total: 1,
      limit: 10,
      offset: 0
    });

    expect(normalized.total).toBe(1);
    expect(normalized.data[0]?.id).toBe("pay-1");
  });

  it("normalizes dashboard and activity payloads", () => {
    const dashboard = normalizeDashboardResponse({
      data: {
        kpis: {
          totalUsers: 10,
          activeSubscriptions: 4,
          revenue: 100,
          activePrograms: 2,
          activeMentorshipClasses: 1,
          upcomingEvents: 3,
          publishedAnnouncements: 5,
          library: {
            ebooks: 8,
            published: 6,
            purchases: 12,
            activeReaders: 4,
            revenue: 25
          }
        },
        modules: {}
      }
    });

    const activity = normalizeActivityResponse({
      data: [
        {
          id: "registration:user-1",
          type: "registration",
          title: "Jane Doe",
          subtitle: "New user registration",
          timestamp: "2026-06-01T10:00:00.000Z",
          resourceId: "user-1"
        }
      ]
    });

    expect(dashboard?.kpis.totalUsers).toBe(10);
    expect(activity).toHaveLength(1);
  });
});
