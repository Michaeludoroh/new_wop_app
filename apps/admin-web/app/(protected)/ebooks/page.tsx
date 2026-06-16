"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { ebooksApi } from "../../../lib/ebooks/api-client";
import { EbookAnalytics, EbookItem, EbookPayload } from "../../../lib/ebooks/types";

const emptyForm = {
  title: "",
  author: "",
  description: "",
  category: "GENERAL",
  price: "0",
  isPremium: false,
  fileUrl: "",
  coverUrl: "",
  isPublished: false
};

export default function EbooksPage() {
  const [ebooks, setEbooks] = useState<EbookItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<EbookAnalytics | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<EbookItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      category: category.trim() || undefined,
      status: status.trim() || undefined,
      limit: 50,
      offset: 0
    }),
    [category, search, status]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [listResponse, analyticsResponse, categoryResponse] = await Promise.all([
        ebooksApi.list(query),
        ebooksApi.analytics(),
        ebooksApi.categories()
      ]);
      setEbooks(listResponse.data);
      setTotal(listResponse.total);
      setAnalytics(analyticsResponse);
      setCategories(categoryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load eBooks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  function startEdit(ebook: EbookItem) {
    setEditing(ebook);
    setForm({
      title: ebook.title,
      author: ebook.author,
      description: ebook.description,
      category: ebook.category,
      price: ebook.price.toString(),
      isPremium: ebook.isPremium,
      fileUrl: ebook.fileUrl,
      coverUrl: ebook.coverUrl ?? "",
      isPublished: ebook.isPublished
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function toPayload(): EbookPayload {
    return {
      title: form.title.trim(),
      author: form.author.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || "GENERAL",
      price: Number(form.price || 0),
      isPremium: form.isPremium,
      fileUrl: form.fileUrl.trim(),
      coverUrl: form.coverUrl.trim() || undefined,
      isPublished: form.isPublished
    };
  }

  async function saveEbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await ebooksApi.update(editing.id, toPayload());
      } else {
        await ebooksApi.create(toPayload());
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save eBook");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(ebook: EbookItem) {
    if (ebook.isPublished) {
      await ebooksApi.unpublish(ebook.id);
    } else {
      await ebooksApi.publish(ebook.id);
    }
    await refresh();
  }

  async function deleteEbook(ebook: EbookItem) {
    if (!window.confirm(`Delete "${ebook.title}"?`)) return;
    await ebooksApi.remove(ebook.id);
    await refresh();
  }

  async function handleFileUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await ebooksApi.uploadFile(file);
      setForm((current) => ({ ...current, fileUrl: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await ebooksApi.uploadCover(file);
      setForm((current) => ({ ...current, coverUrl: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload cover");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>eBooks</h1>
          <p>Upload PDFs, manage categories, publish content, and review reading analytics.</p>
        </section>

        {error ? <p role="alert">{error}</p> : null}

        {analytics ? (
          <section>
            <h2>Reading analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <Metric label="Total eBooks" value={analytics.totals.ebooks} />
              <Metric label="Published" value={analytics.totals.published} />
              <Metric label="Draft" value={analytics.totals.draft} />
              <Metric label="Purchases" value={analytics.totals.purchases} />
              <Metric label="Revenue" value={Number(analytics.totals.revenue).toFixed(2)} />
              <Metric label="Active readers (7d)" value={analytics.totals.activeReadersLast7Days} />
              <Metric label="Completed reads" value={analytics.totals.completedReads} />
              <Metric label="Downloads" value={analytics.totals.downloads} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
              <Ranking title="Top purchased" items={analytics.topPurchased.map((item) => `${item.title} (${item.count})`)} />
              <Ranking title="Top reading activity" items={analytics.topReading.map((item) => `${item.title} (${item.count})`)} />
            </div>
          </section>
        ) : null}

        <section>
          <h2>{editing ? "Edit eBook" : "Create eBook"}</h2>
          <form onSubmit={saveEbook} style={{ display: "grid", gap: 12, maxWidth: 860 }}>
            <input required placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <input placeholder="Author" value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <input list="ebook-categories" placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              <datalist id="ebook-categories">
                {categories.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <input type="number" min={0} step="0.01" placeholder="Price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </div>
            <input required placeholder="PDF URL" value={form.fileUrl} onChange={(event) => setForm({ ...form, fileUrl: event.target.value })} />
            <label>
              Upload PDF
              <input type="file" accept="application/pdf,.pdf" disabled={uploading} onChange={(event) => void handleFileUpload(event.target.files?.[0])} />
            </label>
            <input placeholder="Cover URL" value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} />
            <label>
              Upload cover
              <input type="file" accept="image/*" disabled={uploading} onChange={(event) => void handleCoverUpload(event.target.files?.[0])} />
            </label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={form.isPremium} onChange={(event) => setForm({ ...form, isPremium: event.target.checked })} /> Premium</label>
              <label><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving || uploading}>{saving ? "Saving..." : editing ? "Update eBook" : "Create eBook"}</button>
              {editing ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </section>

        <section>
          <h2>eBook library</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search eBooks" value={search} onChange={(event) => setSearch(event.target.value)} />
            <input placeholder="Category filter" value={category} onChange={(event) => setCategory(event.target.value)} />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <span>{total} total</span>
          </div>
          {loading ? (
            <p>Loading eBooks...</p>
          ) : ebooks.length === 0 ? (
            <p>No eBooks found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Author</th>
                  <th align="left">Category</th>
                  <th align="left">Price</th>
                  <th align="left">Premium</th>
                  <th align="left">Status</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ebooks.map((ebook) => (
                  <tr key={ebook.id}>
                    <td>{ebook.title}</td>
                    <td>{ebook.author}</td>
                    <td>{ebook.category}</td>
                    <td>${ebook.price.toFixed(2)}</td>
                    <td>{ebook.isPremium ? "Yes" : "No"}</td>
                    <td>{ebook.isPublished ? "Published" : ebook.status}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(ebook)}>Edit</button>{" "}
                      <button type="button" onClick={() => void togglePublish(ebook)}>{ebook.isPublished ? "Unpublish" : "Publish"}</button>{" "}
                      <button type="button" onClick={() => void deleteEbook(ebook)}>Delete</button>
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

function Ranking({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? <p>No data yet.</p> : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
