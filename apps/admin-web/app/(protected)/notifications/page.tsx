"use client";

import { FormEvent, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { useAuth } from "../../../providers/auth-provider";
import { useCreateNotification, useNotificationsFeed } from "../../../lib/notifications/hooks";
import {
  CreateBroadcastNotificationPayload,
  CreateTargetedNotificationPayload,
  NotificationChannel
} from "../../../lib/notifications/types";

const channelOptions: NotificationChannel[] = ["IN_APP", "EMAIL", "PUSH"];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [broadcastForm, setBroadcastForm] = useState<CreateBroadcastNotificationPayload>({
    title: "",
    body: "",
    channel: "IN_APP"
  });
  const [targetedForm, setTargetedForm] = useState<CreateTargetedNotificationPayload>({
    title: "",
    body: "",
    channel: "IN_APP",
    userId: ""
  });
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data,
    total,
    limit,
    offset,
    loading,
    error,
    refresh,
    setQuery,
    markReadStateOptimistic
  } = useNotificationsFeed({ limit: 10, offset: 0 });

  const { loading: creating, error: createError, successMessage, createBroadcast, createTargeted, clearStatus } =
    useCreateNotification(() => {
      void refresh();
    });

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const emptyMessage = useMemo(() => {
    if (filter === "read") return "No read notifications.";
    if (filter === "unread") return "No unread notifications.";
    return "No notifications found.";
  }, [filter]);

  const applyFilter = (next: "all" | "read" | "unread") => {
    setFilter(next);
    setQuery({
      isRead: next === "all" ? undefined : next === "read",
      offset: 0
    });
  };

  const onPrev = () => {
    if (offset <= 0) return;
    setQuery({ offset: Math.max(0, offset - limit) });
  };

  const onNext = () => {
    if (currentPage >= totalPages) return;
    setQuery({ offset: offset + limit });
  };

  const submitBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    clearStatus();
    setFormError(null);

    if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) {
      setFormError("Broadcast title and body are required.");
      return;
    }

    const created = await createBroadcast({
      ...broadcastForm,
      title: broadcastForm.title.trim(),
      body: broadcastForm.body.trim()
    });

    if (created) {
      setBroadcastForm({ title: "", body: "", channel: broadcastForm.channel });
    }
  };

  const submitTargeted = async (e: FormEvent) => {
    e.preventDefault();
    clearStatus();
    setFormError(null);

    if (!targetedForm.title.trim() || !targetedForm.body.trim() || !targetedForm.userId.trim()) {
      setFormError("Targeted title, body, and user ID are required.");
      return;
    }

    const created = await createTargeted({
      ...targetedForm,
      title: targetedForm.title.trim(),
      body: targetedForm.body.trim(),
      userId: targetedForm.userId.trim()
    });

    if (created) {
      setTargetedForm((prev) => ({ ...prev, title: "", body: "", userId: "" }));
    }
  };

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 16, background: "#fff" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Notifications</h1>
          <p style={{ margin: "8px 0 0", color: "#475467" }}>
            Monitor notification delivery, read-state, and create broadcast or targeted notifications.
          </p>
        </section>

        <section style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {(["all", "read", "unread"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyFilter(option)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: filter === option ? "1px solid #155eef" : "1px solid #d0d5dd",
                  background: filter === option ? "#eff4ff" : "#fff",
                  cursor: "pointer"
                }}
              >
                {option.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d0d5dd", background: "#fff" }}
            >
              Retry
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 12, color: "#475467" }}>Loading notifications...</div>
          ) : error ? (
            <div style={{ padding: 12, color: "#b42318", background: "#fef3f2", borderRadius: 8 }}>{error}</div>
          ) : data.length === 0 ? (
            <div style={{ padding: 12, color: "#475467" }}>{emptyMessage}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.map((item) => (
                <article
                  key={item.id}
                  style={{
                    border: "1px solid #eaecf0",
                    borderRadius: 10,
                    padding: 12,
                    background: item.isRead ? "#fff" : "#f5f8ff"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <strong>{item.title}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            borderRadius: 999,
                            padding: "2px 8px",
                            background: item.isRead ? "#f2f4f7" : "#ecfdf3",
                            color: item.isRead ? "#344054" : "#027a48"
                          }}
                        >
                          {item.isRead ? "READ" : "UNREAD"}
                        </span>
                        <span style={{ fontSize: 12, color: "#475467" }}>{item.channel}</span>
                        <span style={{ fontSize: 12, color: "#475467" }}>
                          {item.userId ? "TARGETED" : "BROADCAST"}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0", color: "#475467" }}>{item.body}</p>
                      <small style={{ color: "#667085" }}>{formatDate(item.createdAt)}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => void markReadStateOptimistic(item.id, !item.isRead)}
                      style={{ padding: "8px 10px", border: "1px solid #d0d5dd", borderRadius: 8, background: "#fff" }}
                    >
                      Mark as {item.isRead ? "Unread" : "Read"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <small style={{ color: "#667085" }}>
              Page {currentPage} of {totalPages} • Total {total}
            </small>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onPrev} disabled={offset <= 0}>
                Previous
              </button>
              <button type="button" onClick={onNext} disabled={currentPage >= totalPages}>
                Next
              </button>
            </div>
          </div>
        </section>

        {canManage && (
          <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            <form
              onSubmit={submitBroadcast}
              style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 16, background: "#fff", display: "grid", gap: 10 }}
            >
              <h3 style={{ margin: 0 }}>Create Broadcast</h3>
              <input
                placeholder="Title"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                placeholder="Body"
                value={broadcastForm.body}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, body: e.target.value }))}
                rows={4}
              />
              <select
                value={broadcastForm.channel}
                onChange={(e) =>
                  setBroadcastForm((p) => ({ ...p, channel: e.target.value as NotificationChannel }))
                }
              >
                {channelOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={creating}>{creating ? "Submitting..." : "Send Broadcast"}</button>
            </form>

            <form
              onSubmit={submitTargeted}
              style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 16, background: "#fff", display: "grid", gap: 10 }}
            >
              <h3 style={{ margin: 0 }}>Create Targeted</h3>
              <input
                placeholder="User ID"
                value={targetedForm.userId}
                onChange={(e) => setTargetedForm((p) => ({ ...p, userId: e.target.value }))}
              />
              <input
                placeholder="Title"
                value={targetedForm.title}
                onChange={(e) => setTargetedForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                placeholder="Body"
                value={targetedForm.body}
                onChange={(e) => setTargetedForm((p) => ({ ...p, body: e.target.value }))}
                rows={4}
              />
              <select
                value={targetedForm.channel}
                onChange={(e) => setTargetedForm((p) => ({ ...p, channel: e.target.value as NotificationChannel }))}
              >
                {channelOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={creating}>{creating ? "Submitting..." : "Send Targeted"}</button>
            </form>
          </section>
        )}

        {(formError || createError || successMessage) && (
          <section
            style={{
              border: "1px solid #e4e7ec",
              borderRadius: 12,
              padding: 12,
              background: createError || formError ? "#fef3f2" : "#ecfdf3",
              color: createError || formError ? "#b42318" : "#027a48"
            }}
          >
            {formError || createError || successMessage}
          </section>
        )}
      </div>
    </ProtectedModule>
  );
}


