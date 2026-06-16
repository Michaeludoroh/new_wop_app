import { createAuthenticatedClient } from "../auth/http-client";
import {
  normalizeActivityResponse,
  normalizeDashboardResponse,
  normalizeGrowthResponse,
  normalizeOperationalResponse,
  normalizeReportResponse,
  normalizeSummaryResponse,
  normalizeTopContentResponse
} from "./normalize";
import {
  AnalyticsOperationalResponse,
  AnalyticsQuery,
  AnalyticsReportQuery,
  AnalyticsReportResponse,
  AnalyticsSummaryQuery,
  AnalyticsSummaryResponse,
  ActivityItem,
  DashboardResponse,
  GrowthResponse,
  TopContentResponse
} from "./types";

const analyticsClient = createAuthenticatedClient();

export const analyticsApi = {
  async getSummary(query?: AnalyticsSummaryQuery): Promise<AnalyticsSummaryResponse> {
    const response = await analyticsClient.get<unknown>("/analytics/summary", {
      params: query
    });
    const data = normalizeSummaryResponse(response.data);
    if (!data) {
      throw new Error("Invalid analytics summary response");
    }
    return { data };
  },

  async getReport<T = unknown>(query: AnalyticsReportQuery): Promise<AnalyticsReportResponse<T>> {
    const response = await analyticsClient.get<unknown>("/analytics/report", {
      params: query
    });
    return normalizeReportResponse<T>(response.data);
  },

  async getOperational(query?: AnalyticsSummaryQuery): Promise<AnalyticsOperationalResponse> {
    const response = await analyticsClient.get<unknown>("/analytics/operational", {
      params: query
    });
    const data = normalizeOperationalResponse(response.data);
    if (!data) {
      throw new Error("Invalid operational analytics response");
    }
    return { data };
  },

  async getDashboard(query?: AnalyticsQuery): Promise<DashboardResponse> {
    const response = await analyticsClient.get<unknown>("/analytics/dashboard", {
      params: query
    });
    const data = normalizeDashboardResponse(response.data);
    if (!data) {
      throw new Error("Invalid dashboard response");
    }
    return { data };
  },

  async getGrowth(query?: AnalyticsQuery): Promise<GrowthResponse> {
    const response = await analyticsClient.get<unknown>("/analytics/growth", {
      params: query
    });
    const data = normalizeGrowthResponse(response.data);
    if (!data) {
      throw new Error("Invalid growth analytics response");
    }
    return { data };
  },

  async getActivity(query?: AnalyticsQuery): Promise<{ data: ActivityItem[] }> {
    const response = await analyticsClient.get<unknown>("/analytics/activity", {
      params: query
    });
    return { data: normalizeActivityResponse(response.data) };
  },

  async getTopContent(query?: AnalyticsQuery): Promise<TopContentResponse> {
    const response = await analyticsClient.get<unknown>("/analytics/top-content", {
      params: query
    });
    const data = normalizeTopContentResponse(response.data);
    if (!data) {
      throw new Error("Invalid top content response");
    }
    return { data };
  }
};
