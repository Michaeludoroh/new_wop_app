export type RealtimeActor = {
  userId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
};

export type RealtimeEventType =
  | 'notification.created'
  | 'notification.updated'
  | 'notification.read_state_changed'
  | 'announcement.published'
  | 'payment.updated'
  | 'subscription.updated'
  | 'analytics.refresh';

export type RealtimeAudience =
  | { mode: 'user'; userId: string }
  | { mode: 'role'; role: RealtimeActor['role'] }
  | { mode: 'broadcast' };

export type RealtimeEventEnvelope<TPayload> = {
  eventId: string;
  emittedAt: string;
  type: RealtimeEventType;
  audience: RealtimeAudience;
  payload: TPayload;
};

export type NotificationRealtimePayload = {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationReadStatePayload = {
  id: string;
  userId: string | null;
  isRead: boolean;
  updatedAt: string;
};

export type AnnouncementRealtimePayload = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  notificationId?: string;
};

export type PaymentRealtimePayload = {
  paymentTransactionId: string;
  userId: string;
  userSubscriptionId: string | null;
  provider: string;
  providerReference: string;
  status: string;
  happenedAt: string;
};

export type SubscriptionRealtimePayload = {
  subscriptionId: string;
  userId: string;
  planId: string;
  status: string;
  happenedAt: string;
};

export type AnalyticsRefreshPayload = {
  scope: 'summary' | 'operational' | 'report';
  reason:
    | 'notification.created'
    | 'notification.updated'
    | 'payment.updated'
    | 'subscription.updated';
  happenedAt: string;
};

export type OperationalRealtimePayload = {
  kind: 'PAYMENT_UPDATED' | 'SUBSCRIPTION_CHANGED';
  referenceId: string;
  status: string;
  happenedAt: string;
  metadata?: Record<string, unknown>;
};
