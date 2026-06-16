"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { useAnnouncementMutation, useAnnouncementsFeed } from "../../../lib/announcements/hooks";
import { Announcement, AnnouncementCategory, AnnouncementPayload } from "../../../lib/announcements/types";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eaecf0",
  borderRadius: 12,
  padding: 20
};

const initialForm: AnnouncementPayload = {
  title: "",
  content: "",
  category: "GENERAL_UPDATE",
  imageUrl: "",
  isPublished: false
};

export default function AnnouncementsPage() {
  const [form, setForm] = useState<AnnouncementPayload>(initialForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<AnnouncementCategory | "">("");

  const feedQuery = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter,
      category: categoryFilter || undefined,
      page: 1,
      limit: 50
    }),
    [categoryFilter, search, statusFilter]
  );

  const { items, meta, categories, loading, error, refresh } = useAnnouncementsFeed(feedQuery);
  const mutation = useAnnouncementMutation(refresh);

  function resetForm() {
    setForm(initialForm);
    setEditing(null);
    setValidationError(null);
    mutation.clearStatus();
  }

  function startEdit(announcement: Announcement) {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      imageUrl: announcement.imageUrl ?? "",
      isPublished: announcement.isPublished
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

    const payload: AnnouncementPayload = {
      title,
      content,
      category: form.category,
      imageUrl: form.imageUrl?.trim() || null,
      isPublished: form.isPublished
    };

    const saved = await mutation.save(payload, editing?.id);
    if (saved) resetForm();
  }

  async function onImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await mutation.uploadImage(file);
    if (url) setForm((prev) => ({ ...prev, imageUrl: url }));
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <section style={{ display: "grid", gap: 20 }}>
        <header>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Announcements</h1>
          <p style={{ margin: 0, color: "#475467" }}>
            Create drafts, publish ministry announcements, manage categories, and attach images.
          </p>
        </header>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(320px, 420px) 1fr" }}>
          <form onSubmit={onSubmit} style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>{editing ? "Edit announcement" : "Create announcement"}</h2>

            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                style={inputStyle}
              />
            </Field>

            <Field label="Body">
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              />
            </Field>

            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value as AnnouncementCategory }))
                }
                style={inputStyle}
              >
                {(categories.length > 0
                  ? categories
                  : [{ value: "GENERAL_UPDATE", label: "General Update" }]
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Image URL">
              <input
                value={form.imageUrl ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                style={inputStyle}
                placeholder="https://..."
              />
            </Field>

            <Field label="Upload image">
              <input type="file" accept="image/*" onChange={onImageSelected} />
            </Field>

            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt="Announcement preview"
                style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }}
              />
            ) : null}

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(form.isPublished)}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
              />
              Publish immediately
            </label>

            {(validationError || mutation.error || mutation.successMessage) && (
              <div style={{ marginTop: 12, fontSize: 14 }}>
                {validationError ? <p style={{ color: "#b42318" }}>{validationError}</p> : null}
                {mutation.error ? <p style={{ color: "#b42318" }}>{mutation.error}</p> : null}
                {mutation.successMessage ? (
                  <p style={{ color: "#067647" }}>{mutation.successMessage}</p>
                ) : null}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button type="submit" style={primaryButtonStyle} disabled={mutation.loading}>
                {mutation.loading ? "Saving..." : editing ? "Save changes" : "Save announcement"}
              </button>
              {editing ? (
                <button type="button" style={secondaryButtonStyle} onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Announcement feed</h2>
              <button type="button" style={secondaryButtonStyle} onClick={() => void refresh()}>
                Refresh
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or body"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  style={inputStyle}
                >
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Drafts</option>
                  <option value="PUBLISHED">Published</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as AnnouncementCategory | "")
                  }
                  style={inputStyle}
                >
                  <option value="">All categories</option>
                  {(categories.length > 0 ? categories : []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p style={{ color: "#667085", fontSize: 13 }}>
              Showing {items.length} of {meta.total} announcements
            </p>

            {loading ? <p>Loading announcements...</p> : null}
            {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

            {!loading && items.length === 0 ? (
              <p style={{ color: "#667085" }}>No announcements match your filters.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((announcement) => (
                  <li
                    key={announcement.id}
                    style={{
                      border: "1px solid #eaecf0",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 12
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <Badge label={announcement.category} />
                      <Badge label={announcement.status} />
                    </div>
                    {announcement.imageUrl ? (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        style={{
                          width: "100%",
                          maxHeight: 160,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 10
                        }}
                      />
                    ) : null}
                    <h3 style={{ margin: "0 0 6px" }}>{announcement.title}</h3>
                    <p style={{ margin: "0 0 10px", color: "#475467", whiteSpace: "pre-wrap" }}>
                      {announcement.content}
                    </p>
                    <small style={{ color: "#667085" }}>
                      Updated {new Date(announcement.updatedAt).toLocaleString()}
                    </small>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button type="button" style={secondaryButtonStyle} onClick={() => startEdit(announcement)}>
                        Edit
                      </button>
                      {announcement.status === "PUBLISHED" ? (
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() => void mutation.unpublish(announcement.id)}
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() => void mutation.publish(announcement.id)}
                        >
                          Publish
                        </button>
                      )}
                      <button
                        type="button"
                        style={{ ...secondaryButtonStyle, color: "#b42318", borderColor: "#fda29b" }}
                        onClick={() => {
                          if (window.confirm("Delete this announcement?")) {
                            void mutation.remove(announcement.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </ProtectedModule>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: 12 }}>
      <span style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#344054" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: "1px solid #d0d5dd",
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        color: "#344054"
      }}
    >
      {label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14
};

const primaryButtonStyle: React.CSSProperties = {
  border: "1px solid #175cd3",
  background: "#175cd3",
  color: "#fff",
  fontWeight: 600,
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer"
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #d0d5dd",
  background: "#fff",
  color: "#344054",
  fontWeight: 600,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer"
};
