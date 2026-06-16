"use client";

import { useCallback, useEffect, useState } from "react";
import { policiesApi } from "./api-client";
import {
  Policy,
  PolicyAnalyticsResponse,
  PolicyFeedQuery,
  PolicyPayload,
  PolicyPublishReadiness,
  PolicyType,
  PolicyTypeOption
} from "./types";

export function usePoliciesFeed(query: PolicyFeedQuery) {
  const [items, setItems] = useState<Policy[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [types, setTypes] = useState<PolicyTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feed, typeOptions] = await Promise.all([
        policiesApi.getFeed(query),
        policiesApi.getTypes()
      ]);
      setItems(feed.items);
      setMeta(feed.meta);
      setTypes(typeOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, meta, types, loading, error, refresh };
}

export function usePolicyHistory(type: PolicyType | "") {
  const [history, setHistory] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!type) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setHistory(await policiesApi.getHistory(type));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, loading, error, refresh };
}

export function usePolicyAnalytics() {
  const [analytics, setAnalytics] = useState<PolicyAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await policiesApi.getAcceptanceAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load acceptance analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { analytics, loading, error, refresh };
}

export function usePolicyPublishReadiness() {
  const [readiness, setReadiness] = useState<PolicyPublishReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReadiness(await policiesApi.getPublishReadiness());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publish readiness");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { readiness, loading, error, refresh };
}

export function usePolicyMutation(onSuccess?: () => Promise<void> | void) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearStatus = useCallback(() => {
    setStatus(null);
    setError(null);
  }, []);

  const save = useCallback(
    async (payload: PolicyPayload, id?: string) => {
      setBusy(true);
      setError(null);
      try {
        const saved = id
          ? await policiesApi.update(id, payload)
          : await policiesApi.create(payload);
        setStatus(id ? "Policy updated." : "Policy created.");
        await onSuccess?.();
        return saved;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save policy");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onSuccess]
  );

  const publish = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await policiesApi.publish(id);
        setStatus("Policy published.");
        await onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to publish policy");
      } finally {
        setBusy(false);
      }
    },
    [onSuccess]
  );

  const unpublish = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await policiesApi.unpublish(id);
        setStatus("Policy unpublished.");
        await onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unpublish policy");
      } finally {
        setBusy(false);
      }
    },
    [onSuccess]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await policiesApi.remove(id);
        setStatus("Policy deleted.");
        await onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete policy");
      } finally {
        setBusy(false);
      }
    },
    [onSuccess]
  );

  return { busy, status, error, clearStatus, save, publish, unpublish, remove };
}
