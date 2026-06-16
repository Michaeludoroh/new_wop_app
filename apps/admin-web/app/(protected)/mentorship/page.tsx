"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedModule from "../../../components/protected-module";
import { mentorshipApi } from "../../../lib/mentorship/api-client";
import {
  MentorshipAnalytics,
  MentorshipFeedback,
  MentorshipItem,
  MentorshipParticipant,
  MentorshipPayload,
  MentorshipProgressRecord,
  MentorshipSession,
  SessionPayload
} from "../../../lib/mentorship/types";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  category: "GENERAL",
  bannerImageUrl: "",
  mentorName: "",
  mentorBio: "",
  mentorImageUrl: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  capacity: "",
  featured: false,
  published: false
};

const emptySessionForm = {
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: "60",
  meetingLink: "",
  location: "",
  sortOrder: "0"
};

export default function MentorshipPage() {
  const [classes, setClasses] = useState<MentorshipItem[]>([]);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState<MentorshipAnalytics | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState<MentorshipItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<MentorshipItem | null>(null);
  const [participants, setParticipants] = useState<MentorshipParticipant[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [feedback, setFeedback] = useState<MentorshipFeedback[]>([]);
  const [progressRecords, setProgressRecords] = useState<MentorshipProgressRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
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
        mentorshipApi.list(query),
        mentorshipApi.analytics()
      ]);
      setClasses(listResponse.data);
      setTotal(listResponse.total);
      setAnalytics(analyticsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mentorship classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  function startEdit(item: MentorshipItem) {
    setEditing(item);
    setForm({
      title: item.title,
      slug: item.slug,
      description: item.description ?? "",
      category: item.category,
      bannerImageUrl: item.bannerImageUrl ?? "",
      mentorName: item.mentorName ?? "",
      mentorBio: item.mentorBio ?? "",
      mentorImageUrl: item.mentorImageUrl ?? "",
      startDate: toLocalInputValue(item.startDate),
      endDate: toLocalInputValue(item.endDate),
      registrationDeadline: item.registrationDeadline
        ? toLocalInputValue(item.registrationDeadline)
        : "",
      capacity: item.capacity?.toString() ?? "",
      featured: item.featured,
      published: item.published
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function toPayload(): MentorshipPayload {
    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || "GENERAL",
      bannerImageUrl: form.bannerImageUrl.trim() || undefined,
      mentorName: form.mentorName.trim() || undefined,
      mentorBio: form.mentorBio.trim() || undefined,
      mentorImageUrl: form.mentorImageUrl.trim() || undefined,
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

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await mentorshipApi.update(editing.id, toPayload());
      } else {
        await mentorshipApi.create(toPayload());
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mentorship class");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: MentorshipItem) {
    if (item.published) await mentorshipApi.unpublish(item.id);
    else await mentorshipApi.publish(item.id);
    await refresh();
  }

  async function toggleFeatured(item: MentorshipItem) {
    await mentorshipApi.update(item.id, { featured: !item.featured });
    await refresh();
  }

  async function deleteClass(item: MentorshipItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await mentorshipApi.remove(item.id);
    await refresh();
  }

  async function loadParticipants(item: MentorshipItem) {
    setSelectedClass(item);
    setError(null);
    try {
      const response = await mentorshipApi.participants(item.id);
      setParticipants(response.participants);
      setSessions([]);
      setFeedback([]);
      setProgressRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load participants");
    }
  }

  async function loadSessions(item: MentorshipItem) {
    setSelectedClass(item);
    setError(null);
    try {
      const response = await mentorshipApi.sessions(item.id);
      setSessions(response.data);
      setParticipants([]);
      setFeedback([]);
      setProgressRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    }
  }

  async function loadFeedback(item: MentorshipItem) {
    setSelectedClass(item);
    setError(null);
    try {
      const response = await mentorshipApi.feedback(item.id);
      setFeedback(response.data);
      setParticipants([]);
      setSessions([]);
      setProgressRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    }
  }

  async function loadProgress(item: MentorshipItem) {
    setSelectedClass(item);
    setError(null);
    try {
      const response = await mentorshipApi.progress(item.id);
      setProgressRecords(response.data);
      setParticipants([]);
      setSessions([]);
      setFeedback([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    }
  }

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;
    const payload: SessionPayload = {
      title: sessionForm.title.trim(),
      description: sessionForm.description.trim() || undefined,
      scheduledAt: new Date(sessionForm.scheduledAt).toISOString(),
      durationMinutes: Number(sessionForm.durationMinutes),
      meetingLink: sessionForm.meetingLink.trim() || undefined,
      location: sessionForm.location.trim() || undefined,
      sortOrder: Number(sessionForm.sortOrder)
    };
    await mentorshipApi.createSession(selectedClass.id, payload);
    setSessionForm(emptySessionForm);
    await loadSessions(selectedClass);
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Mentorship</h1>
          <p>Manage mentorship classes, mentors, sessions, participants, attendance, and feedback.</p>
        </section>

        {analytics ? (
          <section style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Stat label="Total classes" value={analytics.totalClasses} />
            <Stat label="Published" value={analytics.publishedClasses} />
            <Stat label="Enrolled" value={analytics.activeParticipants} />
            <Stat label="Waitlisted" value={analytics.waitlistedParticipants} />
            <Stat label="Sessions" value={analytics.totalSessions} />
            <Stat label="Avg rating" value={analytics.averageRating.toFixed(1)} />
            <Stat label="Avg completion" value={`${analytics.averageCompletionPct.toFixed(1)}%`} />
          </section>
        ) : null}

        {error ? <p role="alert">{error}</p> : null}

        <section>
          <h2>{editing ? "Edit class" : "Create class"}</h2>
          <form onSubmit={saveClass} style={{ display: "grid", gap: 12, maxWidth: 900 }}>
            <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input placeholder="Mentor name" value={form.mentorName} onChange={(e) => setForm({ ...form, mentorName: e.target.value })} />
              <input type="number" min={1} placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <textarea placeholder="Mentor bio" value={form.mentorBio} onChange={(e) => setForm({ ...form, mentorBio: e.target.value })} />
            <input placeholder="Banner image URL" value={form.bannerImageUrl} onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })} />
            <input placeholder="Mentor image URL" value={form.mentorImageUrl} onChange={(e) => setForm({ ...form, mentorImageUrl: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <label>Start <input required type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
              <label>End <input required type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
              <label>Registration deadline <input type="datetime-local" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} /></label>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
              <label><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update class" : "Create class"}</button>
              {editing ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </section>

        <section>
          <h2>Class library</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <label><input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} /> Featured only</label>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <span>{total} total</span>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : classes.length === 0 ? (
            <p>No mentorship classes found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Mentor</th>
                  <th align="left">Enrolled</th>
                  <th align="left">Waitlist</th>
                  <th align="left">Status</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.mentorName ?? "—"}</td>
                    <td>{item.enrolledCount}{item.capacity ? ` / ${item.capacity}` : ""}</td>
                    <td>{item.waitlistCount}</td>
                    <td>{item.published ? "Published" : "Draft"}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(item)}>Edit</button>{" "}
                      <button type="button" onClick={() => void togglePublish(item)}>{item.published ? "Unpublish" : "Publish"}</button>{" "}
                      <button type="button" onClick={() => void toggleFeatured(item)}>{item.featured ? "Unfeature" : "Feature"}</button>{" "}
                      <button type="button" onClick={() => void loadParticipants(item)}>Participants</button>{" "}
                      <button type="button" onClick={() => void loadSessions(item)}>Sessions</button>{" "}
                      <button type="button" onClick={() => void loadFeedback(item)}>Feedback</button>{" "}
                      <button type="button" onClick={() => void loadProgress(item)}>Progress</button>{" "}
                      <button type="button" onClick={() => void deleteClass(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selectedClass && participants.length >= 0 && participants.length > 0 ? (
          <section>
            <h2>Participants: {selectedClass.title}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Name</th>
                  <th align="left">Email</th>
                  <th align="left">Status</th>
                  <th align="left">Joined</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user?.fullName ?? p.id}</td>
                    <td>{p.user?.email ?? "—"}</td>
                    <td>{p.status}</td>
                    <td>{new Date(p.joinedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {selectedClass && sessions.length >= 0 && (sessions.length > 0 || selectedClass) ? (
          <section>
            <h2>Sessions: {selectedClass.title}</h2>
            <form onSubmit={saveSession} style={{ display: "grid", gap: 8, maxWidth: 700, marginBottom: 16 }}>
              <input required placeholder="Session title" value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} />
              <input required type="datetime-local" value={sessionForm.scheduledAt} onChange={(e) => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })} />
              <input placeholder="Location" value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} />
              <input placeholder="Meeting link" value={sessionForm.meetingLink} onChange={(e) => setSessionForm({ ...sessionForm, meetingLink: e.target.value })} />
              <button type="submit">Add session</button>
            </form>
            {sessions.length === 0 ? (
              <p>No sessions scheduled.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Title</th>
                    <th align="left">Scheduled</th>
                    <th align="left">Location</th>
                    <th align="left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.title}</td>
                      <td>{new Date(session.scheduledAt).toLocaleString()}</td>
                      <td>{session.location ?? session.meetingLink ?? "—"}</td>
                      <td>{session.durationMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}

        {selectedClass && feedback.length > 0 ? (
          <section>
            <h2>Feedback: {selectedClass.title}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Participant</th>
                  <th align="left">Rating</th>
                  <th align="left">Comment</th>
                  <th align="left">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((item) => (
                  <tr key={item.id}>
                    <td>{item.user?.fullName ?? item.userId}</td>
                    <td>{item.rating}/5</td>
                    <td>{item.comment ?? "—"}</td>
                    <td>{new Date(item.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {selectedClass && progressRecords.length > 0 ? (
          <section>
            <h2>Progress: {selectedClass.title}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Participant</th>
                  <th align="left">Completion</th>
                  <th align="left">Milestone</th>
                  <th align="left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {progressRecords.map((record) => (
                  <tr key={record.id ?? record.userId}>
                    <td>{record.user?.fullName ?? record.userId}</td>
                    <td>{record.completionPct.toFixed(1)}%</td>
                    <td>{record.currentMilestone ?? "—"}</td>
                    <td>{record.lastUpdatedAt ? new Date(record.lastUpdatedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
