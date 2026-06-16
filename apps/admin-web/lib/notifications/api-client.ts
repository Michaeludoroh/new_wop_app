import { createAuthenticatedClient } from "../auth/http-client";
import {
  CreateBroadcastNotificationPayload,
  CreateTargetedNotificationPayload,
  NotificationItem,
  NotificationListQuery,
  NotificationListResponse,
  UpdateReadStatePayload
} from "./types";

const client = createAuthenticatedClient();

function toQueryString(query?: NotificationListQuery) {
  if (!query) return "";
  const params = new URLSearchParams();
  if (typeof query.isRead === "boolean") params.set("isRead", String(query.isRead));
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const notificationsApi = {
  async fetchNotifications(query?: NotificationListQuery): Promise<NotificationListResponse> {
    const response = await client.get<NotificationListResponse>(
      `/notifications${toQueryString(query)}`
    );
    return response.data;
  },

  async fetchNotification(id: string): Promise<NotificationItem> {
    const response = await client.get<NotificationItem>(`/notifications/${id}`);
    return response.data;
  },

  async markReadState(id: string, payload: UpdateReadStatePayload): Promise<NotificationItem> {
    const response = await client.patch<NotificationItem>(`/notifications/${id}/read-state`, payload);
    return response.data;
  },

  async createBroadcast(payload: CreateBroadcastNotificationPayload): Promise<NotificationItem> {
    const response = await client.post<NotificationItem>("/notifications/broadcast", payload);
    return response.data;
  },

  async createTargeted(payload: CreateTargetedNotificationPayload): Promise<NotificationItem> {
    const response = await client.post<NotificationItem>("/notifications/targeted", payload);
    return response.data;
  }
};
