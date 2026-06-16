"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { clipsApi } from "../../../lib/clips/api-client";
import { Clip, ClipPayload } from "../../../lib/clips/types";

const emptyForm = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  category: "GENERAL",
  durationSeconds: "",
  speaker: "",
  scriptureReferences: "",
  tags: "",
  featured: false,
  isPublished: false
};

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState<Clip | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      category: category.trim() || undefined,
      featured: featuredOnly || undefined,
      limit: 50,
      offset: 0
    }),
    [category, featuredOnly, search]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await clipsApi.list(query);
      setClips(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  function startEdit(clip: Clip) {
    setEditing(clip);
    setForm({
      title: clip.title,
      description: clip.description ?? "",
      videoUrl: clip.videoUrl,
      thumbnailUrl: clip.thumbnailUrl ?? "",
      category: clip.category,
      durationSeconds: clip.durationSeconds?.toString() ?? "",
      speaker: clip.speaker ?? "",
      scriptureReferences: clip.scriptureReferences.join(", "),
      tags: clip.tags.join(", "),
      featured: clip.featured,
      isPublished: clip.isPublished
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function toPayload(): ClipPayload {
    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      videoUrl: form.videoUrl.trim(),
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      category: form.category.trim() || "GENERAL",
      durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
      speaker: form.speaker.trim() || undefined,
      scriptureReferences: splitList(form.scriptureReferences),
      tags: splitList(form.tags),
      featured: form.featured,
      isPublished: form.isPublished
    };
  }

  async function saveClip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await clipsApi.update(editing.id, toPayload());
      } else {
        await clipsApi.create(toPayload());
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clip");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(clip: Clip) {
    if (clip.isPublished) {
      await clipsApi.unpublish(clip.id);
    } else {
      await clipsApi.publish(clip.id);
    }
    await refresh();
  }

  async function toggleFeatured(clip: Clip) {
    await clipsApi.update(clip.id, { featured: !clip.featured });
    await refresh();
  }

  async function deleteClip(clip: Clip) {
    if (!window.confirm(`Delete "${clip.title}"?`)) return;
    await clipsApi.remove(clip.id);
    await refresh();
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Clips</h1>
          <p>Manage the primary ministry video experience: metadata, publishing, featured placement, and discovery.</p>
        </section>

        {error ? <p role="alert">{error}</p> : null}

        <section>
          <h2>{editing ? "Edit clip" : "Create clip"}</h2>
          <form onSubmit={saveClip} style={{ display: "grid", gap: 12, maxWidth: 760 }}>
            <input required placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <input required placeholder="Video URL" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} />
            <input placeholder="Thumbnail URL" value={form.thumbnailUrl} onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              <input placeholder="Speaker / presenter" value={form.speaker} onChange={(event) => setForm({ ...form, speaker: event.target.value })} />
              <input type="number" min={0} placeholder="Duration seconds" value={form.durationSeconds} onChange={(event) => setForm({ ...form, durationSeconds: event.target.value })} />
            </div>
            <input placeholder="Scripture references, comma-separated" value={form.scriptureReferences} onChange={(event) => setForm({ ...form, scriptureReferences: event.target.value })} />
            <input placeholder="Tags, comma-separated" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
            <div style={{ display: "flex", gap: 16 }}>
              <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label>
              <label><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update clip" : "Create clip"}</button>
              {editing ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </section>

        <section>
          <h2>Clip library</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search clips" value={search} onChange={(event) => setSearch(event.target.value)} />
            <input placeholder="Category filter" value={category} onChange={(event) => setCategory(event.target.value)} />
            <label><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Featured only</label>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <span>{total} total</span>
          </div>
          {loading ? (
            <p>Loading clips...</p>
          ) : clips.length === 0 ? (
            <p>No clips found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Category</th>
                  <th align="left">Speaker</th>
                  <th align="left">Views</th>
                  <th align="left">Status</th>
                  <th align="left">Featured</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clips.map((clip) => (
                  <tr key={clip.id}>
                    <td>{clip.title}</td>
                    <td>{clip.category}</td>
                    <td>{clip.speaker ?? "N/A"}</td>
                    <td>{clip.viewCount}</td>
                    <td>{clip.status}</td>
                    <td>{clip.featured ? "Yes" : "No"}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(clip)}>Edit</button>{" "}
                      <button type="button" onClick={() => void togglePublish(clip)}>{clip.isPublished ? "Unpublish" : "Publish"}</button>{" "}
                      <button type="button" onClick={() => void toggleFeatured(clip)}>{clip.featured ? "Unfeature" : "Feature"}</button>{" "}
                      <button type="button" onClick={() => void deleteClip(clip)}>Delete</button>
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

function splitList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}
