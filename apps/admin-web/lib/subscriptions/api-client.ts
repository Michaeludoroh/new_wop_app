import { createAuthenticatedClient } from "../auth/http-client";
import {
  LifecycleProcessResult,
  SubscriberItem,
  SubscriberListQuery,
  SubscriberListResponse,
  SubscriptionAnalytics,
  SubscriptionStatus
} from "./types";

const subscriptionsClient = createAuthenticatedClient();

function normalizeListResponse(data: unknown): SubscriberListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<SubscriberListResponse>;
    if (Array.isArray(map.data)) {
      return {
        data: map.data,
        total: typeof map.total === "number" ? map.total : map.data.length,
        limit: typeof map.limit === "number" ? map.limit : map.data.length,
        offset: typeof map.offset === "number" ? map.offset : 0
      };
    }
  }
  return { data: [], total: 0, limit: 20, offset: 0 };
}

function unwrapSubscriber(data: unknown): SubscriberItem {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: SubscriberItem }).data;
  }
  return data as SubscriberItem;
}

export const subscriptionsApi = {
  async list(query?: SubscriberListQuery): Promise<SubscriberListResponse> {
    const response = await subscriptionsClient.get<unknown>("/subscriptions/admin", { params: query });
    return normalizeListResponse(response.data);
  },

  async analytics(): Promise<SubscriptionAnalytics> {
    const response = await subscriptionsClient.get<SubscriptionAnalytics>("/subscriptions/admin/analytics");
    return response.data;
  },

  async processLifecycle(): Promise<LifecycleProcessResult> {
    const response = await subscriptionsClient.post<LifecycleProcessResult>(
      "/subscriptions/admin/lifecycle/process"
    );
    return response.data;
  },

  async updateStatus(id: string, status: SubscriptionStatus, reason?: string): Promise<SubscriberItem> {
    const response = await subscriptionsClient.patch<unknown>(`/subscriptions/admin/${id}/status`, {
      status,
      reason
    });
    return unwrapSubscriber(response.data);
  },

  async cancel(id: string, immediate = true, reason?: string): Promise<SubscriberItem> {
    const response = await subscriptionsClient.post<unknown>(`/subscriptions/admin/${id}/cancel`, {
      immediate,
      reason
    });
    return unwrapSubscriber(response.data);
  }
};
