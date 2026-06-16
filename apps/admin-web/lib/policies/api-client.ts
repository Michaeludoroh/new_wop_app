import { createAuthenticatedClient } from "../auth/http-client";
import {
  Policy,
  PolicyAnalyticsResponse,
  PolicyFeedQuery,
  PolicyFeedResponse,
  PolicyPayload,
  PolicyType,
  PolicyTypeOption,
  PolicyPublishReadiness
} from "./types";

const policiesClient = createAuthenticatedClient();

function normalizePolicy(raw: unknown): Policy {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    type: (item.type as PolicyType) ?? "TERMS_OF_USE",
    typeLabel: String(item.typeLabel ?? item.type ?? "Policy"),
    title: String(item.title ?? ""),
    slug: String(item.slug ?? ""),
    content: String(item.content ?? ""),
    version: Number(item.version ?? 1),
    published: Boolean(item.published),
    effectiveDate: item.effectiveDate ? String(item.effectiveDate) : null,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
    acceptanceCount:
      typeof item.acceptanceCount === "number" ? item.acceptanceCount : undefined
  };
}

function normalizeFeedResponse(data: unknown, query?: PolicyFeedQuery): PolicyFeedResponse {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const items = Array.isArray(record.data)
      ? record.data.map(normalizePolicy)
      : [];
    const meta = (record.meta as PolicyFeedResponse["meta"] | undefined) ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? items.length,
      total: items.length,
      totalPages: 1
    };
    return { items, meta };
  }

  return {
    items: [],
    meta: { page: 1, limit: query?.limit ?? 20, total: 0, totalPages: 0 }
  };
}

export const policiesApi = {
  async getTypes(): Promise<PolicyTypeOption[]> {
    const response = await policiesClient.get<{ data: PolicyTypeOption[] }>("/policies/admin/types");
    return response.data.data ?? [];
  },

  async getFeed(query?: PolicyFeedQuery): Promise<PolicyFeedResponse> {
    const response = await policiesClient.get<unknown>("/policies/admin", {
      params: {
        ...query,
        type: query?.type || undefined,
        published:
          query?.published === "ALL" || query?.published === undefined
            ? undefined
            : query.published
      }
    });
    return normalizeFeedResponse(response.data, query);
  },

  async getHistory(type: PolicyType): Promise<Policy[]> {
    const response = await policiesClient.get<{ data: Policy[] }>(`/policies/admin/history/${type}`);
    return (response.data.data ?? []).map(normalizePolicy);
  },

  async getById(id: string): Promise<Policy> {
    const response = await policiesClient.get<unknown>(`/policies/admin/${id}`);
    return normalizePolicy(response.data);
  },

  async create(payload: PolicyPayload): Promise<Policy> {
    const response = await policiesClient.post<unknown>("/policies/admin", payload);
    return normalizePolicy(response.data);
  },

  async update(id: string, payload: Partial<PolicyPayload>): Promise<Policy> {
    const response = await policiesClient.patch<unknown>(`/policies/admin/${id}`, payload);
    return normalizePolicy(response.data);
  },

  async publish(id: string): Promise<Policy> {
    const response = await policiesClient.patch<unknown>(`/policies/admin/${id}/publish`);
    return normalizePolicy(response.data);
  },

  async unpublish(id: string): Promise<Policy> {
    const response = await policiesClient.patch<unknown>(`/policies/admin/${id}/unpublish`);
    return normalizePolicy(response.data);
  },

  async remove(id: string): Promise<void> {
    await policiesClient.delete(`/policies/admin/${id}`);
  },

  async getAcceptanceAnalytics(): Promise<PolicyAnalyticsResponse> {
    const response = await policiesClient.get<PolicyAnalyticsResponse>(
      "/policies/admin/analytics/acceptance"
    );
    return {
      summary: (response.data.summary ?? []).map((item) => ({
        ...item,
        policy: normalizePolicy(item.policy)
      })),
      versionHistory: (response.data.versionHistory ?? []).map(normalizePolicy),
      totals: response.data.totals ?? {
        users: 0,
        activePolicies: 0,
        totalAcceptances: 0
      }
    };
  },

  async getPublishReadiness(): Promise<PolicyPublishReadiness> {
    const response = await policiesClient.get<PolicyPublishReadiness>(
      "/policies/admin/publish-readiness"
    );
    return {
      ready: Boolean(response.data.ready),
      missingTypes: response.data.missingTypes ?? [],
      activePolicies: (response.data.activePolicies ?? []).map(normalizePolicy)
    };
  }
};
