"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyticsApi } from "./api-client";
import {
  ActivityItem,
  AnalyticsOperationalResponse,
  AnalyticsQuery,
  AnalyticsReportQuery,
  AnalyticsReportResponse,
  AnalyticsSummaryQuery,
  AnalyticsSummaryResponse,
  DashboardResponse,
  GrowthResponse,
  TopContentResponse
} from "./types";
import { realtimeSocketClient } from "../realtime/socket-client";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loader();
      setData(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAnalyticsSummary(query?: AnalyticsSummaryQuery): AsyncState<AnalyticsSummaryResponse["data"]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  const state = useAsyncResource(async () => {
    const response = await analyticsApi.getSummary(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);

  useEffect(() => {
    const off = realtimeSocketClient.onEvent("analytics.refresh", () => {
      void state.refresh();
    });
    return () => off();
  }, [state.refresh]);

  return state;
}

export function useAnalyticsOperational(
  query?: AnalyticsSummaryQuery
): AsyncState<AnalyticsOperationalResponse["data"]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  const state = useAsyncResource(async () => {
    const response = await analyticsApi.getOperational(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);

  useEffect(() => {
    const off = realtimeSocketClient.onEvent("analytics.refresh", () => {
      void state.refresh();
    });
    return () => off();
  }, [state.refresh]);

  return state;
}

export function useAnalyticsReport<T = unknown>(
  query: AnalyticsReportQuery
): AsyncState<AnalyticsReportResponse<T>> & { rows: T[]; total: number } {
  const serializedQuery = useMemo(() => JSON.stringify(query), [query]);

  const state = useAsyncResource(async () => {
    const parsedQuery = JSON.parse(serializedQuery) as AnalyticsReportQuery;
    return analyticsApi.getReport<T>(parsedQuery);
  }, [serializedQuery]);

  return {
    ...state,
    rows: state.data?.data ?? [],
    total: state.data?.total ?? 0
  };
}

export function useDashboardAnalytics(query?: AnalyticsQuery): AsyncState<DashboardResponse["data"]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  const state = useAsyncResource(async () => {
    const response = await analyticsApi.getDashboard(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);

  useEffect(() => {
    const off = realtimeSocketClient.onEvent("analytics.refresh", () => {
      void state.refresh();
    });
    return () => off();
  }, [state.refresh]);

  return state;
}

export function useGrowthAnalytics(query?: AnalyticsQuery): AsyncState<GrowthResponse["data"]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  return useAsyncResource(async () => {
    const response = await analyticsApi.getGrowth(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);
}

export function useActivityFeed(query?: AnalyticsQuery): AsyncState<ActivityItem[]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  return useAsyncResource(async () => {
    const response = await analyticsApi.getActivity(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);
}

export function useTopContent(query?: AnalyticsQuery): AsyncState<TopContentResponse["data"]> {
  const queryRef = useRef(query);
  queryRef.current = query;

  return useAsyncResource(async () => {
    const response = await analyticsApi.getTopContent(queryRef.current);
    return response.data;
  }, [JSON.stringify(query ?? {})]);
}
