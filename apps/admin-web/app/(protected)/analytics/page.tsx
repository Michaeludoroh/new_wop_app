"use client";

import { useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { useAnalyticsOperational, useAnalyticsReport, useAnalyticsSummary } from "../../../lib/analytics/hooks";

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const summaryQuery = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined
    }),
    [from, to]
  );

  const { data: summary, loading: summaryLoading, error: summaryError } = useAnalyticsSummary(summaryQuery);
  const { data: operational, loading: operationalLoading, error: operationalError } =
    useAnalyticsOperational(summaryQuery);

  const paymentsReport = useAnalyticsReport<{ id: string; status: string; provider: string; createdAt: string }>({
    report: "payments",
    from: from || undefined,
    to: to || undefined,
    limit: 10,
    offset: 0
  });

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div style={{ display: "grid", gap: 16 }}>
        <section>
          <h1>Analytics Dashboard</h1>
          <p>Track engagement, notifications, payments, subscriptions, and operational health.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <label>
              From{" "}
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </section>

        {(summaryLoading || operationalLoading) && <p>Loading analytics...</p>}
        {(summaryError || operationalError) && (
          <p role="alert">Failed to load analytics data. {summaryError ?? operationalError}</p>
        )}

        {!summaryLoading && !summaryError && summary ? (
          <>
            <section>
              <h2>Engagement Metrics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: 8 }}>
                <MetricCard label="Total Users" value={summary.engagement.totalUsers} />
                <MetricCard label="New Users" value={summary.engagement.newUsers} />
              </div>
            </section>

            <section>
              <h2>Notification Metrics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 8 }}>
                <MetricCard label="Total" value={summary.notifications.total} />
                <MetricCard label="Unread" value={summary.notifications.unread} />
                <MetricCard label="Read" value={summary.notifications.read} />
                <MetricCard label="Read Rate" value={`${summary.notifications.readRate}%`} />
              </div>
            </section>

            <section>
              <h2>Operational Summary</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
                <MetricCard label="Recovered Payments" value={summary.operational.retryRecoveryCount} />
                <MetricCard label="Retrying Payments" value={summary.operational.retryingPayments} />
                <MetricCard label="Failed Payments" value={summary.operational.failedPayments} />
                <MetricCard
                  label="Active Subscriptions"
                  value={summary.operational.activeSubscriptionSummaries}
                />
              </div>
            </section>

            <section>
              <h2>Payment Metrics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(160px, 1fr))", gap: 8 }}>
                <MetricCard label="Total" value={summary.payments.total} />
                <MetricCard label="Succeeded" value={summary.payments.succeeded} />
                <MetricCard label="Failed" value={summary.payments.failed} />
                <MetricCard label="Retrying" value={summary.payments.retrying} />
                <MetricCard label="Success Rate" value={`${summary.payments.successRate}%`} />
              </div>
            </section>

            <section>
              <h2>Subscription Metrics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(160px, 1fr))", gap: 8 }}>
                <MetricCard label="Active" value={summary.subscriptions.active} />
                <MetricCard label="Trialing" value={summary.subscriptions.trialing} />
                <MetricCard label="Past Due" value={summary.subscriptions.pastDue} />
                <MetricCard label="Cancelled" value={summary.subscriptions.cancelled} />
                <MetricCard label="Conversion" value={`${summary.subscriptions.conversionRate}%`} />
              </div>
            </section>
          </>
        ) : null}

        <section>
          <h2>Operational Health Summary</h2>
          {operationalLoading ? (
            <p>Loading operational metrics...</p>
          ) : operationalError ? (
            <p role="alert">Operational metrics unavailable.</p>
          ) : operational ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 8 }}>
              <MetricCard label="Webhook Failed" value={operational.webhook.failed} />
              <MetricCard label="Webhook Duplicates" value={operational.webhook.duplicate} />
              <MetricCard label="Webhook Processed" value={operational.webhook.processed} />
              <MetricCard label="Retrying Payments" value={operational.paymentRecovery.retrying} />
              <MetricCard label="Failed Payments" value={operational.paymentRecovery.failed} />
              <MetricCard
                label="Realtime Connections"
                value={operational.realtime?.activeConnections ?? 0}
              />
            </div>
          ) : (
            <p>No operational data available.</p>
          )}
        </section>

        <section>
          <h2>Payment Report (Recent)</h2>
          {paymentsReport.loading ? (
            <p>Loading payment report...</p>
          ) : paymentsReport.error ? (
            <p role="alert">Failed to load payment report.</p>
          ) : paymentsReport.rows.length === 0 ? (
            <p>No payment records in selected range.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">ID</th>
                  <th align="left">Provider</th>
                  <th align="left">Status</th>
                  <th align="left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {paymentsReport.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.provider}</td>
                    <td>{row.status}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        background: "#fff"
      }}
    >
      <p style={{ margin: 0, color: "#666", fontSize: 12 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 700 }}>{value}</p>
    </article>
  );
}


