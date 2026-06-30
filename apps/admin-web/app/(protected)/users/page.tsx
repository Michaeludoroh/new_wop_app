"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { normalizeApiError } from "../../../lib/http/normalize-error";
import { usersApi } from "../../../lib/users/api-client";
import { AdminUser, UserFeedQuery } from "../../../lib/users/types";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eaecf0",
  borderRadius: 12,
  padding: 20
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  padding: "10px 12px"
};

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserFeedQuery["role"]>("");
  const [statusFilter, setStatusFilter] = useState<UserFeedQuery["status"]>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      role: roleFilter || undefined,
      status: statusFilter,
      limit: 50,
      offset: 0
    }),
    [roleFilter, search, statusFilter]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.getUsers(query);
      setItems(response.data);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  async function openUser(user: AdminUser) {
    setSelected(user);
    setStatusMessage(null);
    try {
      const response = await usersApi.getUser(user.id);
      setSelected(response.data);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load user details"));
    }
  }

  async function onRoleChange(event: FormEvent<HTMLSelectElement>) {
    if (!selected) return;
    const role = event.currentTarget.value as AdminUser["role"];
    setStatusMessage(null);
    try {
      const updated = await usersApi.updateRole(selected.id, role);
      setSelected(updated.data);
      setStatusMessage("Role updated.");
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to update user role"));
    }
  }

  async function toggleActive() {
    if (!selected) return;
    setStatusMessage(null);
    try {
      const updated = await usersApi.updateStatus(selected.id, !selected.active);
      setSelected(updated.data);
      setStatusMessage(updated.data.active ? "User reactivated." : "User disabled.");
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to update user status"));
    }
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div style={{ display: "grid", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Users Management</h1>
          <p style={{ color: "#667085", marginTop: 8 }}>
            Search members, review subscription status, and manage roles.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value as UserFeedQuery["role"])
                  }
                  style={inputStyle}
                >
                  <option value="">All roles</option>
                  <option value="USER">User</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as UserFeedQuery["status"])
                  }
                  style={inputStyle}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>

            {loading ? <p>Loading users...</p> : null}
            {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
            {!loading && items.length === 0 ? <p>No users found.</p> : null}

            <div style={{ display: "grid", gap: 10 }}>
              {items.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openUser(user)}
                  style={{
                    textAlign: "left",
                    border:
                      selected?.id === user.id
                        ? "1px solid #6941c6"
                        : "1px solid #eaecf0",
                    borderRadius: 10,
                    padding: 14,
                    background: "#fff",
                    cursor: "pointer"
                  }}
                >
                  <strong>{user.fullName}</strong>
                  <div style={{ color: "#667085", fontSize: 13 }}>{user.email}</div>
                  <div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>
                    {user.role} · {user.active ? "Active" : "Disabled"}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>User Profile</h2>
            {!selected ? (
              <p style={{ color: "#667085" }}>Select a user to view details.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <strong>{selected.fullName}</strong>
                  <div style={{ color: "#667085" }}>{selected.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#667085" }}>Role</div>
                  <select
                    value={selected.role}
                    onChange={(event) => void onRoleChange(event)}
                    style={inputStyle}
                  >
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#667085" }}>Subscription</div>
                  <div>
                    {selected.subscription?.planName ?? "No subscription"} ·{" "}
                    {selected.subscription?.status ?? "NONE"}
                  </div>
                </div>
                {selected.subscription ? (
                  <>
                    <div>
                      <div style={{ fontSize: 13, color: "#667085" }}>Trial</div>
                      <div>
                        {selected.subscription.trialActive ? "Active" : "Inactive"}
                        {selected.subscription.trialEndsAt
                          ? ` · ends ${selected.subscription.trialEndsAt}`
                          : ""}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "#667085" }}>Subscription expiry</div>
                      <div>{selected.subscription.subscriptionEndsAt ?? "Not set"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "#667085" }}>Last payment</div>
                      <div>{selected.subscription.lastPaymentAt ?? "None"}</div>
                    </div>
                  </>
                ) : null}
                <div>
                  <div style={{ fontSize: 13, color: "#667085" }}>Last login</div>
                  <div>{selected.lastLoginAt ?? "Never"}</div>
                </div>
                <button type="button" onClick={() => void toggleActive()}>
                  {selected.active ? "Disable user" : "Reactivate user"}
                </button>
                {statusMessage ? <p style={{ color: "#027a48" }}>{statusMessage}</p> : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedModule>
  );
}
