"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { programsApi } from "../../../lib/programs/api-client";
import {
  ProgramAnalytics,
  ProgramEnrollment,
  ProgramItem,
  ProgramPayload,
  ProgramProgressRecord
} from "../../../lib/programs/types";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  category: "GENERAL",
  bannerImageUrl: "",
  instructorName: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  capacity: "",
  featured: false,
  published: false
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState<ProgramAnalytics | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState<ProgramItem | null>(null);
  const [enrollmentProgram, setEnrollmentProgram] = useState<ProgramItem | null>(null);
  const [progressProgram, setProgressProgram] = useState<ProgramItem | null>(null);
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgramProgressRecord[]>([]);
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
      const [listResponse, analyticsResponse] = await Promise.all([
        programsApi.list(query),
        programsApi.analytics()
      ]);
      setPrograms(listResponse.data);
      setTotal(listResponse.total);
      setAnalytics(analyticsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  function startEdit(program: ProgramItem) {
    setEditing(program);
    setForm({
      title: program.title,
      slug: program.slug,
      description: program.description ?? "",
      category: program.category,
      bannerImageUrl: program.bannerImageUrl ?? "",
      instructorName: program.instructorName ?? "",
      startDate: toLocalInputValue(program.startDate),
      endDate: toLocalInputValue(program.endDate),
      registrationDeadline: program.registrationDeadline
        ? toLocalInputValue(program.registrationDeadline)
        : "",
      capacity: program.capacity?.toString() ?? "",
      featured: program.featured,
      published: program.published
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function toPayload(): ProgramPayload {
    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || "GENERAL",
      bannerImageUrl: form.bannerImageUrl.trim() || undefined,
      instructorName: form.instructorName.trim() || undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      registrationDeadline: form.registrationDeadline
        ? new Date(form.registrationDeadline).toISOString()
        : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      featured: form.featured,
      published: form.published
    };
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await programsApi.update(editing.id, toPayload());
      } else {
        await programsApi.create(toPayload());
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save program");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(program: ProgramItem) {
    if (program.published) {
      await programsApi.unpublish(program.id);
    } else {
      await programsApi.publish(program.id);
    }
    await refresh();
  }

  async function toggleFeatured(program: ProgramItem) {
    await programsApi.update(program.id, { featured: !program.featured });
    await refresh();
  }

  async function deleteProgram(program: ProgramItem) {
    if (!window.confirm(`Delete "${program.title}" and its enrollment records?`)) return;
    await programsApi.remove(program.id);
    await refresh();
  }

  async function loadEnrollments(program: ProgramItem) {
    setEnrollmentProgram(program);
    setProgressProgram(null);
    setError(null);
    try {
      const response = await programsApi.enrollments(program.id);
      setEnrollments(response.enrollments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enrollments");
    }
  }

  async function loadProgress(program: ProgramItem) {
    setProgressProgram(program);
    setEnrollmentProgram(null);
    setError(null);
    try {
      const response = await programsApi.progress(program.id);
      setProgressRecords(response.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    }
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Programs</h1>
          <p>Manage empowerment programs, enrollment capacity, featured placement, and participant progress.</p>
        </section>

        {analytics ? (
          <section style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Stat label="Total programs" value={analytics.totalPrograms} />
            <Stat label="Published" value={analytics.publishedPrograms} />
            <Stat label="Featured" value={analytics.featuredPrograms} />
            <Stat label="Active enrollments" value={analytics.activeEnrollments} />
            <Stat label="Avg completion" value={`${analytics.averageCompletionPct.toFixed(1)}%`} />
          </section>
        ) : null}

        {error ? <p role="alert">{error}</p> : null}

        <section>
          <h2>{editing ? "Edit program" : "Create program"}</h2>
          <form onSubmit={saveProgram} style={{ display: "grid", gap: 12, maxWidth: 860 }}>
            <input required placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <input placeholder="Slug (optional)" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              <input placeholder="Instructor name" value={form.instructorName} onChange={(event) => setForm({ ...form, instructorName: event.target.value })} />
              <input type="number" min={1} placeholder="Capacity" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
            </div>
            <input placeholder="Banner image URL" value={form.bannerImageUrl} onChange={(event) => setForm({ ...form, bannerImageUrl: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <label>Start <input required type="datetime-local" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
              <label>End <input required type="datetime-local" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
              <label>Registration deadline <input type="datetime-local" value={form.registrationDeadline} onChange={(event) => setForm({ ...form, registrationDeadline: event.target.value })} /></label>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label>
              <label><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update program" : "Create program"}</button>
              {editing ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </section>

        <section>
          <h2>Program library</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search programs" value={search} onChange={(event) => setSearch(event.target.value)} />
            <input placeholder="Category filter" value={category} onChange={(event) => setCategory(event.target.value)} />
            <label><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Featured only</label>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <span>{total} total</span>
          </div>
          {loading ? (
            <p>Loading programs...</p>
          ) : programs.length === 0 ? (
            <p>No programs found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Category</th>
                  <th align="left">Instructor</th>
                  <th align="left">Start</th>
                  <th align="left">Enrolled</th>
                  <th align="left">Status</th>
                  <th align="left">Featured</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td>{program.title}</td>
                    <td>{program.category}</td>
                    <td>{program.instructorName ?? "—"}</td>
                    <td>{new Date(program.startDate).toLocaleString()}</td>
                    <td>{program.enrolledCount}{program.capacity ? ` / ${program.capacity}` : ""}</td>
                    <td>{program.published ? "Published" : "Draft"}</td>
                    <td>{program.featured ? "Yes" : "No"}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(program)}>Edit</button>{" "}
                      <button type="button" onClick={() => void togglePublish(program)}>{program.published ? "Unpublish" : "Publish"}</button>{" "}
                      <button type="button" onClick={() => void toggleFeatured(program)}>{program.featured ? "Unfeature" : "Feature"}</button>{" "}
                      <button type="button" onClick={() => void loadEnrollments(program)}>Enrollments</button>{" "}
                      <button type="button" onClick={() => void loadProgress(program)}>Progress</button>{" "}
                      <button type="button" onClick={() => void deleteProgram(program)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {enrollmentProgram ? (
          <section>
            <h2>Enrollments: {enrollmentProgram.title}</h2>
            {enrollments.length === 0 ? (
              <p>No enrollments yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Name</th>
                    <th align="left">Email</th>
                    <th align="left">Role</th>
                    <th align="left">Status</th>
                    <th align="left">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.user.fullName}</td>
                      <td>{enrollment.user.email}</td>
                      <td>{enrollment.user.role}</td>
                      <td>{enrollment.status}</td>
                      <td>{new Date(enrollment.enrolledAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}

        {progressProgram ? (
          <section>
            <h2>Progress: {progressProgram.title}</h2>
            {progressRecords.length === 0 ? (
              <p>No progress records yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Participant</th>
                    <th align="left">Completion</th>
                    <th align="left">Current module</th>
                    <th align="left">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.user?.fullName ?? record.userId}</td>
                      <td>{record.completionPct.toFixed(1)}%</td>
                      <td>{record.currentModule ?? "—"}</td>
                      <td>{new Date(record.lastUpdatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}
      </div>
    </ProtectedModule>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, minWidth: 120 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
