"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { subscriptionsApi } from "../../../lib/subscriptions/api-client";
import { SubscriberItem, SubscriptionAnalytics } from "../../../lib/subscriptions/types";

const STATUS_OPTIONS = ["", "ACTIVE", "GRACE", "PENDING", "CANCELLED", "EXPIRED"];

export default function SubscriptionsPage() {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      planCode: planCode.trim() || undefined,
      limit: 50,
      offset: 0
    }),
    [planCode, search, status]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [listResponse, analyticsResponse] = await Promise.all([
        subscriptionsApi.list(query),
        subscriptionsApi.analytics()
      ]);
      setSubscribers(listResponse.data);
      setTotal(listResponse.total);
      setAnalytics(analyticsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  async function runLifecycle() {
    setProcessing(true);
    try {
      await subscriptionsApi.processLifecycle();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lifecycle processing failed");
    } finally {
      setProcessing(false);
    }
  }

  async function setSubscriberStatus(subscriber: SubscriberItem, nextStatus: SubscriberItem["status"]) {
    await subscriptionsApi.updateStatus(subscriber.id, nextStatus, `Updated from admin dashboard`);
    await refresh();
  }

  async function cancelSubscriber(subscriber: SubscriberItem) {
    if (!window.confirm(`Cancel subscription for ${subscriber.user?.email ?? subscriber.userId}?`)) return;
    await subscriptionsApi.cancel(subscriber.id, true, "Cancelled by administrator");
    await refresh();
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Subscription Monitoring</h1>
          <p>Manage subscribers, grace periods, renewals, and premium access analytics.</p>
        </section>

        {error ? <p role="alert">{error}</p> : null}

        {analytics ? (
          <section>
            <h2>Subscription analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <Metric label="Active" value={analytics.totals.active} />
              <Metric label="Grace" value={analytics.totals.grace} />
              <Metric label="Pending" value={analytics.totals.pending} />
              <Metric label="Cancelled" value={analytics.totals.cancelled} />
              <Metric label="Expired" value={analytics.totals.expired} />
              <Metric label="Expiring soon" value={analytics.totals.expiringSoon} />
              <Metric label="MRR" value={Number(analytics.totals.mrr).toFixed(2)} />
              <Metric label="Premium access" value={analytics.totals.premiumAccess} />
            </div>
            <div style={{ marginTop: 16 }}>
              <h3>Recent status transitions</h3>
              {analytics.recentTransitions.length === 0 ? (
                <p>No transitions recorded yet.</p>
              ) : (
                <ul>
                  {analytics.recentTransitions.map((entry) => (
                    <li key={entry.id}>
                      {entry.userEmail}: {entry.fromStatus ?? "NEW"} → {entry.toStatus}
                      {entry.reason ? ` (${entry.reason})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        <section>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search email or name" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All statuses"}
                </option>
              ))}
            </select>
            <input placeholder="Plan code" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <button type="button" onClick={() => void runLifecycle()} disabled={processing}>
              {processing ? "Processing..." : "Run lifecycle"}
            </button>
            <span>{total} total</span>
          </div>
        </section>

        <section>
          <h2>Subscribers</h2>
          {loading ? (
            <p>Loading subscribers...</p>
          ) : subscribers.length === 0 ? (
            <p>No subscribers match your filters.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">User</th>
                  <th align="left">Plan</th>
                  <th align="left">Status</th>
                  <th align="left">Period end</th>
                  <th align="left">Grace ends</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td>{subscriber.user?.email ?? subscriber.userId}</td>
                    <td>{subscriber.plan?.code ?? "—"}</td>
                    <td>{subscriber.status}</td>
                    <td>{subscriber.currentPeriodEnd ? new Date(subscriber.currentPeriodEnd).toLocaleString() : "—"}</td>
                    <td>{subscriber.graceEndsAt ? new Date(subscriber.graceEndsAt).toLocaleString() : "—"}</td>
                    <td>
                      {subscriber.status !== "ACTIVE" ? (
                        <button type="button" onClick={() => void setSubscriberStatus(subscriber, "ACTIVE")}>Activate</button>
                      ) : null}{" "}
                      {subscriber.status !== "GRACE" ? (
                        <button type="button" onClick={() => void setSubscriberStatus(subscriber, "GRACE")}>Grace</button>
                      ) : null}{" "}
                      <button type="button" onClick={() => void cancelSubscriber(subscriber)}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </ProtectedModule>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}
