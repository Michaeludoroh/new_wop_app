import {
  AnalyticsOperationalResponse,
  AnalyticsReportQuery,
  AnalyticsReportResponse,
  AnalyticsQuery,
  AnalyticsSummaryQuery,
  AnalyticsSummaryResponse,
  ActivityItem,
  DashboardResponse,
  GrowthResponse,
  TopContentResponse
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unwrapData<T>(payload: unknown): T | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }
  if ("data" in record) {
    return record.data as T;
  }
  return payload as T;
}

export function normalizeSummaryResponse(payload: unknown): AnalyticsSummaryResponse["data"] | null {
  const data = unwrapData<Record<string, unknown>>(payload);
  if (!data) {
    return null;
  }

  if ("engagement" in data) {
    return data as AnalyticsSummaryResponse["data"];
  }

  const engagement = asRecord(data.engagement) ?? data;
  const notifications = asRecord(data.notifications) ?? {};
  const payments = asRecord(data.payments) ?? {};
  const subscriptions = asRecord(data.subscriptions) ?? {};
  const operational = asRecord(data.operational) ?? {};

  return {
    engagement: {
      totalUsers: numberValue(engagement.totalUsers ?? data.users),
      newUsers: numberValue(engagement.newUsers)
    },
    notifications: {
      total: numberValue(notifications.total),
      unread: numberValue(notifications.unread),
      read: numberValue(notifications.read),
      readRate: numberValue(notifications.readRate)
    },
    payments: {
      total: numberValue(payments.total),
      succeeded: numberValue(payments.succeeded ?? payments.success),
      failed: numberValue(payments.failed),
      retrying: numberValue(payments.retrying),
      recovered: numberValue(payments.recovered),
      successRate: numberValue(payments.successRate)
    },
    subscriptions: {
      active: numberValue(subscriptions.active),
      trialing: numberValue(subscriptions.trialing),
      cancelled: numberValue(subscriptions.cancelled),
      pastDue: numberValue(subscriptions.pastDue ?? subscriptions.grace),
      conversionRate: numberValue(subscriptions.conversionRate)
    },
    operational: {
      retryRecoveryCount: numberValue(operational.retryRecoveryCount),
      retryingPayments: numberValue(operational.retryingPayments),
      failedPayments: numberValue(operational.failedPayments),
      activeSubscriptionSummaries: numberValue(operational.activeSubscriptionSummaries)
    }
  };
}

export function normalizeOperationalResponse(
  payload: unknown
): AnalyticsOperationalResponse["data"] | null {
  const data = unwrapData<Record<string, unknown>>(payload);
  if (!data) {
    return null;
  }

  if ("webhook" in data) {
    return data as AnalyticsOperationalResponse["data"];
  }

  const webhook = asRecord(data.webhook) ?? {};
  const paymentRecovery = asRecord(data.paymentRecovery) ?? {};
  const realtime = asRecord(data.realtime) ?? {};

  return {
    webhook: {
      failed: numberValue(webhook.failed),
      duplicate: numberValue(webhook.duplicate),
      processed: numberValue(webhook.processed)
    },
    paymentRecovery: {
      retrying: numberValue(paymentRecovery.retrying),
      failed: numberValue(paymentRecovery.failed)
    },
    realtime: {
      activeConnections: numberValue(realtime.activeConnections)
    }
  };
}

export function normalizeReportResponse<T>(payload: unknown): AnalyticsReportResponse<T> {
  const record = asRecord(payload);
  if (!record) {
    return { data: [], total: 0, limit: 0, offset: 0 };
  }

  if (Array.isArray(record.data)) {
    return {
      data: record.data as T[],
      total: numberValue(record.total),
      limit: numberValue(record.limit),
      offset: numberValue(record.offset)
    };
  }

  if (Array.isArray(record.payments)) {
    return {
      data: record.payments as T[],
      total: record.payments.length,
      limit: record.payments.length,
      offset: 0
    };
  }

  return { data: [], total: 0, limit: 0, offset: 0 };
}

export function normalizeDashboardResponse(payload: unknown): DashboardResponse["data"] | null {
  return unwrapData<DashboardResponse["data"]>(payload);
}

export function normalizeGrowthResponse(payload: unknown): GrowthResponse["data"] | null {
  return unwrapData<GrowthResponse["data"]>(payload);
}

export function normalizeActivityResponse(payload: unknown): ActivityItem[] {
  const data = unwrapData<ActivityItem[]>(payload);
  return Array.isArray(data) ? data : [];
}

export function normalizeTopContentResponse(payload: unknown): TopContentResponse["data"] | null {
  return unwrapData<TopContentResponse["data"]>(payload);
}

export type { AnalyticsReportQuery, AnalyticsQuery, AnalyticsSummaryQuery };
