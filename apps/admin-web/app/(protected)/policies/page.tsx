"use client";

import { FormEvent, useMemo, useState } from "react";
import PolicyRichTextEditor from "../../../components/policy-rich-text-editor";
import ProtectedModule from "../../../components/protected-module";
import {
  usePolicyAnalytics,
  usePolicyHistory,
  usePolicyMutation,
  usePolicyPublishReadiness,
  usePoliciesFeed
} from "../../../lib/policies/hooks";
import { Policy, PolicyPayload, PolicyType } from "../../../lib/policies/types";

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

const initialForm: PolicyPayload = {
  type: "TERMS_OF_USE",
  title: "",
  slug: "",
  content: "",
  effectiveDate: null,
  published: false
};

export default function PoliciesPage() {
  const [form, setForm] = useState<PolicyPayload>(initialForm);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PolicyType | "">("");
  const [publishedFilter, setPublishedFilter] = useState<"ALL" | "true" | "false">("ALL");
  const [historyType, setHistoryType] = useState<PolicyType | "">("TERMS_OF_USE");

  const feedQuery = useMemo(
    () => ({
      search: search.trim() || undefined,
      type: typeFilter,
      published:
        publishedFilter === "ALL" ? ("ALL" as const) : publishedFilter === "true",
      page: 1,
      limit: 50
    }),
    [publishedFilter, search, typeFilter]
  );

  const { items, meta, types, loading, error, refresh } = usePoliciesFeed(feedQuery);
  const { history, loading: historyLoading } = usePolicyHistory(historyType);
  const { analytics, loading: analyticsLoading } = usePolicyAnalytics();
  const { readiness, loading: readinessLoading } = usePolicyPublishReadiness();
  const mutation = usePolicyMutation(refresh);

  function resetForm() {
    setForm(initialForm);
    setEditing(null);
    setValidationError(null);
    mutation.clearStatus();
  }

  function startEdit(policy: Policy) {
    setEditing(policy);
    setForm({
      type: policy.type,
      title: policy.title,
      slug: policy.slug,
      content: policy.content,
      effectiveDate: policy.effectiveDate,
      published: policy.published
    });
    mutation.clearStatus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    mutation.clearStatus();

    const title = form.title.trim();
    const content = form.content.trim();
    if (!title) {
      setValidationError("Title is required.");
      return;
    }
    if (!content) {
      setValidationError("Content is required.");
      return;
    }

    const payload: PolicyPayload = {
      type: form.type,
      title,
      slug: form.slug?.trim() || undefined,
      content,
      effectiveDate: form.effectiveDate || null,
      published: form.published
    };

    const saved = await mutation.save(payload, editing?.id);
    if (saved) resetForm();
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Policies & Governance</h1>
          <p style={{ color: "#667085", marginTop: 8 }}>
            Manage Terms of Use, Privacy Policy, Community Guidelines, and Content Sharing Rules.
          </p>
        </div>

        {!readinessLoading && readiness ? (
          <section
            style={{
              ...cardStyle,
              borderColor: readiness.ready ? "#abefc6" : "#fecdca",
              background: readiness.ready ? "#ecfdf3" : "#fef3f2"
            }}
          >
            <strong>{readiness.ready ? "Launch ready" : "Publish validation required"}</strong>
            <p style={{ margin: "8px 0 0", color: "#667085" }}>
              {readiness.ready
                ? "All required policy types have an active published version."
                : `Missing active policies: ${readiness.missingTypes.join(", ")}`}
            </p>
          </section>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>{editing ? "Edit Policy" : "Create Policy"}</h2>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <label>
                Type
                <select
                  value={form.type}
                  disabled={Boolean(editing)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value as PolicyType }))
                  }
                  style={{ ...inputStyle, marginTop: 6 }}
                >
                  {types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>

              <label>
                Slug (optional)
                <input
                  value={form.slug ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="Auto-generated from type and version"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>

              <label>
                Effective date
                <input
                  type="datetime-local"
                  value={form.effectiveDate ? form.effectiveDate.slice(0, 16) : ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      effectiveDate: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null
                    }))
                  }
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </label>

              <div>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Content</div>
                <PolicyRichTextEditor
                  value={form.content}
                  onChange={(content) => setForm((prev) => ({ ...prev, content }))}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.published)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, published: event.target.checked }))
                  }
                />
                Publish immediately
              </label>

              {validationError ? <p style={{ color: "#b42318" }}>{validationError}</p> : null}
              {mutation.error ? <p style={{ color: "#b42318" }}>{mutation.error}</p> : null}
              {mutation.status ? <p style={{ color: "#027a48" }}>{mutation.status}</p> : null}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={mutation.busy}>
                  {editing ? "Save changes" : "Create policy"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Policies</h2>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, slug, or content"
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as PolicyType | "")}
                  style={inputStyle}
                >
                  <option value="">All types</option>
                  {types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={publishedFilter}
                  onChange={(event) =>
                    setPublishedFilter(event.target.value as "ALL" | "true" | "false")
                  }
                  style={inputStyle}
                >
                  <option value="ALL">All statuses</option>
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>
              </div>
            </div>

            {loading ? <p>Loading policies...</p> : null}
            {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
            {!loading && items.length === 0 ? <p>No policies found.</p> : null}

            <div style={{ display: "grid", gap: 12 }}>
              {items.map((policy) => (
                <article
                  key={policy.id}
                  style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: 14 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong>{policy.title}</strong>
                      <div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>
                        {policy.typeLabel} · v{policy.version} · {policy.slug}
                      </div>
                    </div>
                    <span
                      style={{
                        alignSelf: "start",
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: policy.published ? "#ecfdf3" : "#f2f4f7",
                        color: policy.published ? "#027a48" : "#344054"
                      }}
                    >
                      {policy.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p style={{ color: "#475467", fontSize: 14 }}>
                    Acceptances: {policy.acceptanceCount ?? 0}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button type="button" onClick={() => startEdit(policy)}>
                      Edit
                    </button>
                    {policy.published ? (
                      <button type="button" onClick={() => mutation.unpublish(policy.id)}>
                        Unpublish
                      </button>
                    ) : (
                      <button type="button" onClick={() => mutation.publish(policy.id)}>
                        Publish
                      </button>
                    )}
                    <button type="button" onClick={() => mutation.remove(policy.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p style={{ color: "#667085", fontSize: 13, marginTop: 12 }}>
              Showing {items.length} of {meta.total}
            </p>
          </section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Version History</h2>
            <select
              value={historyType}
              onChange={(event) => setHistoryType(event.target.value as PolicyType | "")}
              style={{ ...inputStyle, marginBottom: 12 }}
            >
              {types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {historyLoading ? <p>Loading history...</p> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {history.map((policy) => (
                <div
                  key={policy.id}
                  style={{ border: "1px solid #eaecf0", borderRadius: 8, padding: 12 }}
                >
                  <strong>v{policy.version}</strong> · {policy.title}
                  <div style={{ color: "#667085", fontSize: 13 }}>
                    {policy.published ? "Published" : "Draft"} · {policy.acceptanceCount ?? 0} acceptances
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Acceptance Analytics</h2>
            {analyticsLoading ? <p>Loading analytics...</p> : null}
            {analytics ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ color: "#667085" }}>
                  {analytics.totals.activePolicies} active policies · {analytics.totals.users} users ·{" "}
                  {analytics.totals.totalAcceptances} total acceptances
                </p>
                {analytics.summary.map((item) => (
                  <div
                    key={item.policy.id}
                    style={{ border: "1px solid #eaecf0", borderRadius: 8, padding: 12 }}
                  >
                    <strong>{item.policy.typeLabel}</strong> v{item.policy.version}
                    <div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>
                      Accepted: {item.acceptedCount} · Pending: {item.pendingCount} · Rate:{" "}
                      {(item.acceptanceRate * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </ProtectedModule>
  );
}
