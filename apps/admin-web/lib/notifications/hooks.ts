"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi } from "./api-client";
import {
  CreateBroadcastNotificationPayload,
  CreateTargetedNotificationPayload,
  NotificationItem,
  NotificationListQuery,
  NotificationListResponse
} from "./types";
import { realtimeSocketClient, RealtimeEventEnvelope } from "../realtime/socket-client";

function normalizeError(err: unknown, fallback: string) {
  if (typeof err === "object" && err && "response" in err) {
    const maybe = err as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybe.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
    if (typeof maybe.message === "string") return maybe.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

type UseNotificationsFeedResult = {
  data: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setQuery: (next: NotificationListQuery) => void;
  query: NotificationListQuery;
  markReadStateOptimistic: (id: string, isRead: boolean) => Promise<void>;
};

export function useNotificationsFeed(initialQuery?: NotificationListQuery): UseNotificationsFeedResult {
  const [state, setState] = useState<NotificationListResponse>({
    data: [],
    total: 0,
    limit: initialQuery?.limit ?? 20,
    offset: initialQuery?.offset ?? 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryState] = useState<NotificationListQuery>({
    isRead: initialQuery?.isRead,
    limit: initialQuery?.limit ?? 20,
    offset: initialQuery?.offset ?? 0
  });

  const queryRef = useRef(query);
  queryRef.current = query;
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.fetchNotifications(queryRef.current);
      setState(response);
    } catch (err) {
      setError(normalizeError(err, "Failed to fetch notifications"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, query]);

  useEffect(() => {
    const mergeItem = (item: NotificationItem) => {
      setState((prev) => {
        const existingIndex = prev.data.findIndex((n) => n.id === item.id);
        if (existingIndex >= 0) {
          const next = [...prev.data];
          next[existingIndex] = { ...next[existingIndex], ...item };
          return { ...prev, data: next };
        }

        const matchesFilter =
          queryRef.current.isRead === undefined || queryRef.current.isRead === item.isRead;

        if (!matchesFilter) return prev;

        return {
          ...prev,
          data: [item, ...prev.data]
        };
      });
    };

    const removeSeenOverflow = () => {
      if (seenEventIdsRef.current.size > 1000) {
        const next = new Set<string>();
        let count = 0;
        for (const id of seenEventIdsRef.current) {
          next.add(id);
          count += 1;
          if (count >= 500) break;
        }
        seenEventIdsRef.current = next;
      }
    };

    const shouldProcess = (event: RealtimeEventEnvelope<unknown>) => {
      if (!event?.eventId) return true;
      if (seenEventIdsRef.current.has(event.eventId)) return false;
      seenEventIdsRef.current.add(event.eventId);
      removeSeenOverflow();
      return true;
    };

    const offCreated = realtimeSocketClient.onEvent<NotificationItem>(
      "notification.created",
      (event) => {
        if (!shouldProcess(event)) return;
        mergeItem(event.payload);
      }
    );

    const offUpdated = realtimeSocketClient.onEvent<NotificationItem>(
      "notification.updated",
      (event) => {
        if (!shouldProcess(event)) return;
        mergeItem(event.payload);
      }
    );

    const offReadState = realtimeSocketClient.onEvent<{ id: string; isRead: boolean; updatedAt: string }>(
      "notification.read_state_changed",
      (event) => {
        if (!shouldProcess(event)) return;
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.id === event.payload.id
              ? { ...item, isRead: event.payload.isRead, updatedAt: event.payload.updatedAt }
              : item
          )
        }));
      }
    );

    const offUnauthorized = realtimeSocketClient.onUnauthorized(() => {
      // fallback to api polling lifecycle
      void refresh();
    });

    return () => {
      offCreated();
      offUpdated();
      offReadState();
      offUnauthorized();
      realtimeSocketClient.disconnect();
    };
  }, [refresh]);

  const setQuery = useCallback((next: NotificationListQuery) => {
    setQueryState((prev) => ({
      ...prev,
      ...next
    }));
  }, []);

  const markReadStateOptimistic = useCallback(async (id: string, isRead: boolean) => {
    const previous = state;
    setState((prev) => ({
      ...prev,
      data: prev.data.map((item) => (item.id === id ? { ...item, isRead } : item))
    }));

    try {
      await notificationsApi.markReadState(id, { isRead });
    } catch (err) {
      setState(previous);
      setError(normalizeError(err, "Failed to update read state"));
      throw err;
    }
  }, [state]);

  return {
    data: state.data,
    total: state.total,
    limit: state.limit,
    offset: state.offset,
    loading,
    error,
    refresh,
    setQuery,
    query,
    markReadStateOptimistic
  };
}

type UseCreateNotificationResult = {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  createBroadcast: (payload: CreateBroadcastNotificationPayload) => Promise<NotificationItem | null>;
  createTargeted: (payload: CreateTargetedNotificationPayload) => Promise<NotificationItem | null>;
  clearStatus: () => void;
};

export function useCreateNotification(
  onCreated?: (item: NotificationItem) => void
): UseCreateNotificationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const createBroadcast = useCallback(async (payload: CreateBroadcastNotificationPayload) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const created = await notificationsApi.createBroadcast(payload);
      setSuccessMessage("Broadcast notification created.");
      onCreatedRef.current?.(created);
      return created;
    } catch (err) {
      setError(normalizeError(err, "Failed to create broadcast notification"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTargeted = useCallback(async (payload: CreateTargetedNotificationPayload) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const created = await notificationsApi.createTargeted(payload);
      setSuccessMessage("Targeted notification created.");
      onCreatedRef.current?.(created);
      return created;
    } catch (err) {
      setError(normalizeError(err, "Failed to create targeted notification"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return { loading, error, successMessage, createBroadcast, createTargeted, clearStatus };
}
