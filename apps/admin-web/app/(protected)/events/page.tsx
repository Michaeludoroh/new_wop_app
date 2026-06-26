"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { normalizeApiError } from "../../../lib/http/normalize-error";
import ProtectedModule from "../../../components/protected-module";
import { eventsApi } from "../../../lib/events/api-client";
import { EventAttendee, EventItem, EventLocationType, EventPayload } from "../../../lib/events/types";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  category: "GENERAL",
  bannerImageUrl: "",
  locationType: "PHYSICAL" as EventLocationType,
  venue: "",
  meetingLink: "",
  startDateTime: "",
  endDateTime: "",
  registrationRequired: false,
  maxCapacity: "",
  featured: false,
  published: false
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [attendeeEvent, setAttendeeEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
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
      const response = await eventsApi.list(query);
      setEvents(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  function startEdit(event: EventItem) {
    setEditing(event);
    setForm({
      title: event.title,
      slug: event.slug,
      description: event.description ?? "",
      category: event.category,
      bannerImageUrl: event.bannerImageUrl ?? "",
      locationType: event.locationType,
      venue: event.venue ?? "",
      meetingLink: event.meetingLink ?? "",
      startDateTime: toLocalInputValue(event.startDateTime),
      endDateTime: toLocalInputValue(event.endDateTime),
      registrationRequired: event.registrationRequired,
      maxCapacity: event.maxCapacity?.toString() ?? "",
      featured: event.featured,
      published: event.published
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function toPayload(): EventPayload {
    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || "GENERAL",
      bannerImageUrl: form.bannerImageUrl.trim() || undefined,
      locationType: form.locationType,
      venue: form.venue.trim() || undefined,
      meetingLink: form.meetingLink.trim() || undefined,
      startDateTime: new Date(form.startDateTime).toISOString(),
      endDateTime: new Date(form.endDateTime).toISOString(),
      registrationRequired: form.registrationRequired,
      maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
      featured: form.featured,
      published: form.published
    };
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await eventsApi.update(editing.id, toPayload());
      } else {
        await eventsApi.create(toPayload());
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeApiError(err, "Failed to save event"));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(event: EventItem) {
    if (event.published) {
      await eventsApi.unpublish(event.id);
    } else {
      await eventsApi.publish(event.id);
    }
    await refresh();
  }

  async function toggleFeatured(event: EventItem) {
    await eventsApi.update(event.id, { featured: !event.featured });
    await refresh();
  }

  async function deleteEvent(event: EventItem) {
    if (!window.confirm(`Delete "${event.title}" and its RSVP records?`)) return;
    await eventsApi.remove(event.id);
    await refresh();
  }

  async function loadAttendees(event: EventItem) {
    setAttendeeEvent(event);
    setError(null);
    try {
      const response = await eventsApi.attendees(event.id);
      setAttendees(response.attendees);
    } catch (err) {
      setError(normalizeApiError(err, "Failed to load attendees"));
    }
  }

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 24 }}>
        <section>
          <h1>Events</h1>
          <p>Manage event publishing, featured placement, location details, RSVP capacity, and attendees.</p>
        </section>

        {error ? <p role="alert">{error}</p> : null}

        <section>
          <h2>{editing ? "Edit event" : "Create event"}</h2>
          <form onSubmit={saveEvent} style={{ display: "grid", gap: 12, maxWidth: 860 }}>
            <input required placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <input placeholder="Slug (optional)" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              <select value={form.locationType} onChange={(event) => setForm({ ...form, locationType: event.target.value as EventLocationType })}>
                <option value="PHYSICAL">Physical</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              <input type="number" min={1} placeholder="Max capacity" value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} />
            </div>
            <input placeholder="Banner image URL" value={form.bannerImageUrl} onChange={(event) => setForm({ ...form, bannerImageUrl: event.target.value })} />
            <input placeholder="Venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
            <input placeholder="Meeting link" value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <label>Start <input required type="datetime-local" value={form.startDateTime} onChange={(event) => setForm({ ...form, startDateTime: event.target.value })} /></label>
              <label>End <input required type="datetime-local" value={form.endDateTime} onChange={(event) => setForm({ ...form, endDateTime: event.target.value })} /></label>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={form.registrationRequired} onChange={(event) => setForm({ ...form, registrationRequired: event.target.checked })} /> Registration required</label>
              <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label>
              <label><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Published</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update event" : "Create event"}</button>
              {editing ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </section>

        <section>
          <h2>Event library</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search events" value={search} onChange={(event) => setSearch(event.target.value)} />
            <input placeholder="Category filter" value={category} onChange={(event) => setCategory(event.target.value)} />
            <label><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Featured only</label>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
            <span>{total} total</span>
          </div>
          {loading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p>No events found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th align="left">Title</th>
                  <th align="left">Category</th>
                  <th align="left">Start</th>
                  <th align="left">Location</th>
                  <th align="left">RSVPs</th>
                  <th align="left">Status</th>
                  <th align="left">Featured</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{event.category}</td>
                    <td>{new Date(event.startDateTime).toLocaleString()}</td>
                    <td>{event.locationType}</td>
                    <td>{event.attendeeCount}{event.maxCapacity ? ` / ${event.maxCapacity}` : ""}</td>
                    <td>{event.published ? "Published" : "Draft"}</td>
                    <td>{event.featured ? "Yes" : "No"}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(event)}>Edit</button>{" "}
                      <button type="button" onClick={() => void togglePublish(event)}>{event.published ? "Unpublish" : "Publish"}</button>{" "}
                      <button type="button" onClick={() => void toggleFeatured(event)}>{event.featured ? "Unfeature" : "Feature"}</button>{" "}
                      <button type="button" onClick={() => void loadAttendees(event)}>Attendees</button>{" "}
                      <button type="button" onClick={() => void deleteEvent(event)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {attendeeEvent ? (
          <section>
            <h2>Attendees: {attendeeEvent.title}</h2>
            {attendees.length === 0 ? (
              <p>No RSVPs yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Name</th>
                    <th align="left">Email</th>
                    <th align="left">Role</th>
                    <th align="left">Status</th>
                    <th align="left">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td>{attendee.user.fullName}</td>
                      <td>{attendee.user.email}</td>
                      <td>{attendee.user.role}</td>
                      <td>{attendee.status}</td>
                      <td>{new Date(attendee.registeredAt).toLocaleString()}</td>
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

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
