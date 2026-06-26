"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { normalizeApiError } from "../../../lib/http/normalize-error";
import { subscriptionsApi } from "../../../lib/subscriptions/api-client";
import { SubscriberItem, SubscriptionAnalytics, SubscriptionHistoryItem, SubscriptionPlan } from "../../../lib/subscriptions/types";

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selected, setSelected] = useState<SubscriberItem | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [planForm, setPlanForm] = useState({
    code: "",
    name: "",
    amount: "0",
    currency: "USD",
    billingInterval: "MONTHLY"
  });

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
      const [listResponse, analyticsResponse, plansResponse] = await Promise.all([
        subscriptionsApi.list(query),
        subscriptionsApi.analytics(),
        subscriptionsApi.listPlans()
      ]);
      setSubscribers(listResponse.data);
      setTotal(listResponse.total);
      setAnalytics(analyticsResponse);
      setPlans(plansResponse);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load subscriptions"));
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
      setError(normalizeApiError(err, "Lifecycle processing failed"));
    } finally {
      setProcessing(false);
    }
  }

  async function setSubscriberStatus(subscriber: SubscriberItem, nextStatus: SubscriberItem["status"]) {
    try {
      await subscriptionsApi.updateStatus(subscriber.id, nextStatus, `Updated from admin dashboard`);
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to update subscriber status"));
    }
  }

  async function cancelSubscriber(subscriber: SubscriberItem) {
    if (!window.confirm(`Cancel subscription for ${subscriber.user?.email ?? subscriber.userId}?`)) return;
    try {
      await subscriptionsApi.cancel(subscriber.id, true, "Cancelled by administrator");
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to cancel subscription"));
    }
  }

  async function openSubscriber(subscriber: SubscriberItem) {
    try {
      const [detail, statusHistory] = await Promise.all([
        subscriptionsApi.getById(subscriber.id),
        subscriptionsApi.getHistory(subscriber.id)
      ]);
      setSelected(detail);
      setHistory(statusHistory);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load subscriber details"));
    }
  }

  async function createPlan() {
    try {
      await subscriptionsApi.createPlan({
        code: planForm.code.trim().toUpperCase(),
        name: planForm.name.trim(),
        amount: Number(planForm.amount),
        currency: planForm.currency.trim().toUpperCase(),
        billingInterval: planForm.billingInterval,
        isActive: true,
        recurringEnabled: true
      });
      setPlanForm({ code: "", name: "", amount: "0", currency: "USD", billingInterval: "MONTHLY" });
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to create subscription plan"));
    }
  }

  async function deactivatePlan(plan: SubscriptionPlan) {
    try {
      await subscriptionsApi.updatePlan(plan.id, { isActive: false });
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to deactivate plan"));
    }
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
          <h2>Subscription plans</h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Plan code"
                value={planForm.code}
                onChange={(e) => setPlanForm((current) => ({ ...current, code: e.target.value }))}
              />
              <input
                placeholder="Plan name"
                value={planForm.name}
                onChange={(e) => setPlanForm((current) => ({ ...current, name: e.target.value }))}
              />
              <input
                placeholder="Amount"
                value={planForm.amount}
                onChange={(e) => setPlanForm((current) => ({ ...current, amount: e.target.value }))}
              />
              <input
                placeholder="Currency"
                value={planForm.currency}
                onChange={(e) => setPlanForm((current) => ({ ...current, currency: e.target.value }))}
              />
              <select
                value={planForm.billingInterval}
                onChange={(e) => setPlanForm((current) => ({ ...current, billingInterval: e.target.value }))}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <button type="button" onClick={() => void createPlan()}>Create plan</button>
            </div>
            {plans.length === 0 ? (
              <p>No subscription plans configured.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Code</th>
                    <th align="left">Name</th>
                    <th align="left">Amount</th>
                    <th align="left">Interval</th>
                    <th align="left">Active</th>
                    <th align="left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.code}</td>
                      <td>{plan.name}</td>
                      <td>{plan.amount}</td>
                      <td>{plan.billingInterval}</td>
                      <td>{plan.isActive === false ? "No" : "Yes"}</td>
                      <td>
                        {plan.isActive !== false ? (
                          <button type="button" onClick={() => void deactivatePlan(plan)}>Deactivate</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

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
                      <button type="button" onClick={() => void openSubscriber(subscriber)}>View</button>{" "}
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

        {selected ? (
          <section>
            <h2>Subscriber detail</h2>
            <p><strong>User:</strong> {selected.user?.fullName ?? selected.user?.email ?? selected.userId}</p>
            <p><strong>Status:</strong> {selected.status}</p>
            <p><strong>Plan:</strong> {selected.plan?.name ?? selected.plan?.code ?? "—"}</p>
            <p><strong>Period:</strong> {selected.currentPeriodStart ? new Date(selected.currentPeriodStart).toLocaleString() : "—"} → {selected.currentPeriodEnd ? new Date(selected.currentPeriodEnd).toLocaleString() : "—"}</p>
            <h3>Status history</h3>
            {history.length === 0 ? (
              <p>No status transitions recorded.</p>
            ) : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    {entry.fromStatus ?? "NEW"} → {entry.toStatus}
                    {entry.reason ? ` (${entry.reason})` : ""} — {new Date(entry.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
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
