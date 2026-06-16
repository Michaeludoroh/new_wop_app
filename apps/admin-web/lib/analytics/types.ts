export type AnalyticsSummaryQuery = {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  section?:
    | "overview"
    | "engagement"
    | "notifications"
    | "payments"
    | "subscriptions"
    | "operational";
};

export type AnalyticsReportQuery = {
  report: "notifications" | "payments" | "subscriptions" | "users";
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  limit?: number;
  offset?: number;
};

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  limit?: number;
  offset?: number;
};

export type TrendPoint = {
  date: string;
  value: number;
};

export type AnalyticsSummaryResponse = {
  data: {
    engagement: {
      totalUsers: number;
      newUsers: number;
    };
    notifications: {
      total: number;
      unread: number;
      read: number;
      readRate: number;
    };
    payments: {
      total: number;
      succeeded: number;
      failed: number;
      retrying: number;
      recovered: number;
      successRate: number;
    };
    subscriptions: {
      active: number;
      trialing: number;
      cancelled: number;
      pastDue: number;
      conversionRate: number;
    };
    operational: {
      retryRecoveryCount: number;
      retryingPayments: number;
      failedPayments: number;
      activeSubscriptionSummaries: number;
    };
  };
};

export type AnalyticsReportResponse<T = unknown> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AnalyticsOperationalResponse = {
  data: {
    webhook: {
      failed: number;
      duplicate: number;
      processed: number;
    };
    paymentRecovery: {
      retrying: number;
      failed: number;
    };
    realtime?: {
      activeConnections: number;
    };
  };
};

export type DashboardLibraryStats = {
  ebooks: number;
  published: number;
  purchases: number;
  activeReaders: number;
  revenue: number;
};

export type DashboardKpis = {
  totalUsers: number;
  activeSubscriptions: number;
  revenue: number;
  activePrograms: number;
  activeMentorshipClasses: number;
  upcomingEvents: number;
  publishedAnnouncements: number;
  library: DashboardLibraryStats;
};

export type DashboardModules = {
  users: AnalyticsSummaryResponse["data"]["engagement"];
  subscriptions: AnalyticsSummaryResponse["data"]["subscriptions"];
  revenue: {
    total: number;
    payments: number;
    ebookPurchases: number;
  };
  ebooks: DashboardLibraryStats;
  events: {
    total: number;
    published: number;
    upcoming: number;
    registrations: number;
  };
  programs: {
    totalPrograms: number;
    publishedPrograms: number;
    activeEnrollments: number;
    averageCompletionPct: number;
  };
  mentorship: {
    totalClasses: number;
    publishedClasses: number;
    activeParticipants: number;
    totalSessions: number;
    averageRating: number;
  };
  notifications: AnalyticsSummaryResponse["data"]["notifications"];
  announcements: {
    total: number;
    published: number;
    draft: number;
    pushSent: number;
  };
};

export type DashboardResponse = {
  data: {
    kpis: DashboardKpis;
    modules: DashboardModules;
  };
};

export type GrowthResponse = {
  data: {
    revenue: TrendPoint[];
    users: TrendPoint[];
    subscriptions: TrendPoint[];
    programEnrollments: TrendPoint[];
    mentorshipParticipants: TrendPoint[];
    eventRegistrations: TrendPoint[];
  };
};

export type ActivityItem = {
  id: string;
  type: "registration" | "purchase" | "enrollment" | "rsvp" | "announcement";
  title: string;
  subtitle: string;
  timestamp: string;
  resourceId: string;
};

export type ActivityResponse = {
  data: ActivityItem[];
};

export type TopContentResponse = {
  data: {
    ebooks: Array<{
      id: string;
      title: string;
      purchases: number;
      readers: number;
    }>;
    clips: Array<{
      id: string;
      title: string;
      viewCount: number;
      category: string;
    }>;
  };
};
