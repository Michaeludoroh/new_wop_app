import { createAuthenticatedClient } from "../auth/http-client";
import {
  LifecycleProcessResult,
  SubscriberItem,
  SubscriberListQuery,
  SubscriberListResponse,
  SubscriptionAnalytics,
  SubscriptionPlan,
  SubscriptionPlanPayload,
  SubscriptionHistoryItem,
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

function unwrapPlan(data: unknown): SubscriptionPlan {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: SubscriptionPlan }).data;
  }
  return data as SubscriptionPlan;
}

function normalizePlans(data: unknown): SubscriptionPlan[] {
  if (Array.isArray(data)) return data as SubscriptionPlan[];
  if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: SubscriptionPlan[] }).data;
  }
  return [];
}

export const subscriptionsApi = {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const response = await subscriptionsClient.get<unknown>("/subscriptions/plans");
    return normalizePlans(response.data);
  },

  async createPlan(payload: SubscriptionPlanPayload): Promise<SubscriptionPlan> {
    const response = await subscriptionsClient.post<unknown>("/subscriptions/plans", payload);
    return unwrapPlan(response.data);
  },

  async updatePlan(id: string, payload: Partial<SubscriptionPlanPayload>): Promise<SubscriptionPlan> {
    const response = await subscriptionsClient.patch<unknown>(`/subscriptions/plans/${id}`, payload);
    return unwrapPlan(response.data);
  },

  async deletePlan(id: string): Promise<void> {
    await subscriptionsClient.delete(`/subscriptions/plans/${id}`);
  },

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
  },

  async getById(id: string): Promise<SubscriberItem> {
    const response = await subscriptionsClient.get<unknown>(`/subscriptions/admin/${id}`);
    return unwrapSubscriber(response.data);
  },

  async getHistory(id: string): Promise<SubscriptionHistoryItem[]> {
    const response = await subscriptionsClient.get<unknown>(`/subscriptions/admin/${id}/history`);
    const payload = response.data;
    if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data: unknown }).data)) {
      return (payload as { data: SubscriptionHistoryItem[] }).data;
    }
    if (Array.isArray(payload)) return payload as SubscriptionHistoryItem[];
    return [];
  }
};
