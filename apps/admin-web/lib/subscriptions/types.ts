export type SubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "GRACE"
  | "CANCELLED"
  | "EXPIRED";

export type SubscriptionAccess = {
  hasPremiumAccess: boolean;
  isGracePeriod: boolean;
  graceEndsAt?: string | null;
  daysRemainingInGrace?: number | null;
  renewalDue: boolean;
  cancelAtPeriodEnd: boolean;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  amount: number | string;
  currency?: string;
  billingInterval: string;
  trialPeriodDays?: number;
  isActive?: boolean;
  recurringEnabled?: boolean;
};

export type SubscriptionPlanPayload = {
  code: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  billingInterval: string;
  trialPeriodDays?: number;
  isActive?: boolean;
  recurringEnabled?: boolean;
};

export type SubscriberItem = {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  graceEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
  plan?: SubscriptionPlan;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  access?: SubscriptionAccess;
};

export type SubscriberListQuery = {
  search?: string;
  status?: string;
  planCode?: string;
  limit?: number;
  offset?: number;
};

export type SubscriberListResponse = {
  data: SubscriberItem[];
  total: number;
  limit: number;
  offset: number;
};

export type SubscriptionAnalytics = {
  totals: {
    active: number;
    grace: number;
    pending: number;
    cancelled: number;
    expired: number;
    expiringSoon: number;
    mrr: number;
    premiumAccess: number;
  };
  recentTransitions: Array<{
    id: string;
    userEmail: string;
    userName: string;
    fromStatus?: SubscriptionStatus | null;
    toStatus: SubscriptionStatus;
    reason?: string | null;
    createdAt: string;
  }>;
};

export type LifecycleProcessResult = {
  processed: number;
  breakdown: {
    trialActivations: number;
    periodEndCancellations: number;
    graceExpirations: number;
    periodRenewalGrace: number;
    retryDue: number;
  };
};

export type SubscriptionHistoryItem = {
  id: string;
  fromStatus?: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  reason?: string | null;
  createdAt: string;
};
