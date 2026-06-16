export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH";

export type NotificationItem = {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  channel: NotificationChannel;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type NotificationListQuery = {
  isRead?: boolean;
  limit?: number;
  offset?: number;
};

export type NotificationListResponse = {
  data: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateBroadcastNotificationPayload = {
  title: string;
  body: string;
  channel: NotificationChannel;
};

export type CreateTargetedNotificationPayload = {
  title: string;
  body: string;
  channel: NotificationChannel;
  userId: string;
};

export type UpdateReadStatePayload = {
  isRead: boolean;
};
