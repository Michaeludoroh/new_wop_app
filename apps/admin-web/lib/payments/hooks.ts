"use client";

import { useCallback, useEffect, useState } from "react";
import { paymentsApi, PaymentHistoryQuery } from "./api-client";
import { PaymentTransaction, PaymentWebhookEvent } from "./types";

export function usePaymentHistory(query?: PaymentHistoryQuery) {
  const [items, setItems] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentsApi.getHistory(query);
      setItems(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}

export function usePaymentWebhookEvents() {
  const [items, setItems] = useState<PaymentWebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentsApi.getWebhookEvents();
      setItems(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhook events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
