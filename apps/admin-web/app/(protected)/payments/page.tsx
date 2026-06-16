"use client";

import { useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { usePaymentHistory, usePaymentWebhookEvents } from "../../../lib/payments/hooks";
import { PaymentStatus } from "../../../lib/payments/types";

export default function PaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const query = useMemo(() => ({ status: status || undefined }), [status]);
  const transactions = usePaymentHistory(query);
  const webhookEvents = usePaymentWebhookEvents();

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Payments</h1>
          <p>View Flutterwave transactions, payment states, and webhook reconciliation events.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <label htmlFor="payment-status">Status</label>
            <select
              id="payment-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PaymentStatus | "")}
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button type="button" onClick={() => void transactions.refresh()}>
              Refresh transactions
            </button>
            <button type="button" onClick={() => void webhookEvents.refresh()}>
              Refresh webhooks
            </button>
          </div>
        </section>

        <section>
          <h2>Transactions</h2>
          {transactions.loading ? (
            <p>Loading transactions...</p>
          ) : transactions.error ? (
            <p role="alert">Failed to load transactions. {transactions.error}</p>
          ) : transactions.items.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Reference</th>
                  <th align="left">Type</th>
                  <th align="left">Provider</th>
                  <th align="left">Amount</th>
                  <th align="left">Status</th>
                  <th align="left">Retry</th>
                  <th align="left">Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.providerReference}</td>
                    <td>{item.transactionType}</td>
                    <td>{item.provider}</td>
                    <td>
                      {item.currency} {String(item.amount)}
                    </td>
                    <td>{item.status}</td>
                    <td>{item.retryable ? `Yes (${item.retryCount})` : "No"}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Webhook Events</h2>
          {webhookEvents.loading ? (
            <p>Loading webhook events...</p>
          ) : webhookEvents.error ? (
            <p role="alert">Failed to load webhook events. {webhookEvents.error}</p>
          ) : webhookEvents.items.length === 0 ? (
            <p>No webhook events received.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">External Event</th>
                  <th align="left">Type</th>
                  <th align="left">Provider</th>
                  <th align="left">Status</th>
                  <th align="left">Signature</th>
                  <th align="left">Received</th>
                </tr>
              </thead>
              <tbody>
                {webhookEvents.items.map((event) => (
                  <tr key={event.id}>
                    <td>{event.externalEventId}</td>
                    <td>{event.eventType}</td>
                    <td>{event.provider}</td>
                    <td>{event.processingStatus}</td>
                    <td>{event.signatureValid ? "Valid" : "Invalid"}</td>
                    <td>{new Date(event.receivedAt).toLocaleString()}</td>
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
