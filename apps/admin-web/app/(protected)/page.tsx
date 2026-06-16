"use client";

import Link from "next/link";
import ProtectedModule from "../../components/protected-module";
import { adminNavLinks } from "../../components/nav-links";
import { useAuth } from "../../providers/auth-provider";
import {
  useActivityFeed,
  useDashboardAnalytics,
  useGrowthAnalytics,
  useTopContent
} from "../../lib/analytics/hooks";
import { ActivityItem, TrendPoint } from "../../lib/analytics/types";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eaecf0",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
};

const mutedStyle: React.CSSProperties = { color: "#667085", margin: 0 };

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function activityLabel(type: ActivityItem["type"]) {
  switch (type) {
    case "registration":
      return "Registration";
    case "purchase":
      return "Purchase";
    case "enrollment":
      return "Enrollment";
    case "rsvp":
      return "RSVP";
    case "announcement":
      return "Announcement";
    default:
      return type;
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const canViewAnalytics = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const moduleLinks = adminNavLinks.filter((item) => item.href !== "/");

  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <section style={{ display: "grid", gap: 20 }}>
        <header>
          <h1 style={{ marginTop: 0, marginBottom: 8, color: "#101828" }}>Ministry Admin Dashboard</h1>
          <p style={{ marginTop: 0, color: "#475467" }}>
            {canViewAnalytics
              ? "Platform overview with live KPIs, growth trends, and recent activity."
              : "Manage ministry modules from the navigation below."}
          </p>
        </header>

        {canViewAnalytics ? <AdminDashboardMetrics /> : null}

        <section>
          <h2 style={{ margin: "0 0 12px", color: "#101828" }}>Admin modules</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12
            }}
          >
            {moduleLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  border: "1px solid #eaecf0",
                  borderRadius: 10,
                  padding: 14,
                  background: "#fff",
                  display: "block"
                }}
              >
                <h3 style={{ margin: "0 0 6px", color: "#101828", fontSize: 16 }}>{item.label}</h3>
                <p style={{ margin: 0, color: "#667085", fontSize: 13 }}>{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </ProtectedModule>
  );
}

function AdminDashboardMetrics() {
  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useDashboardAnalytics();
  const { data: growth, loading: growthLoading } = useGrowthAnalytics();
  const { data: activity, loading: activityLoading } = useActivityFeed({ limit: 12 });
  const { data: topContent, loading: topContentLoading } = useTopContent({ limit: 5 });

  return (
    <>
      {(dashboardLoading || dashboardError) && (
        <div style={cardStyle}>
          {dashboardLoading ? <p style={mutedStyle}>Loading dashboard metrics...</p> : null}
          {dashboardError ? (
            <p style={{ ...mutedStyle, color: "#b42318" }} role="alert">
              Failed to load dashboard metrics. {dashboardError}
            </p>
          ) : null}
        </div>
      )}

      {dashboard ? (
        <>
          <section>
            <h2 style={{ margin: "0 0 12px", color: "#101828" }}>Key metrics</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <MetricCard label="Total users" value={dashboard.kpis.totalUsers} />
              <MetricCard label="Active subscriptions" value={dashboard.kpis.activeSubscriptions} />
              <MetricCard label="Revenue" value={formatCurrency(dashboard.kpis.revenue)} />
              <MetricCard label="Active programs" value={dashboard.kpis.activePrograms} />
              <MetricCard label="Active mentorship classes" value={dashboard.kpis.activeMentorshipClasses} />
              <MetricCard label="Upcoming events" value={dashboard.kpis.upcomingEvents} />
              <MetricCard label="Published announcements" value={dashboard.kpis.publishedAnnouncements} />
              <MetricCard
                label="Library eBooks"
                value={dashboard.kpis.library.published}
                hint={`${dashboard.kpis.library.purchases} purchases`}
              />
              <MetricCard label="Active readers (7d)" value={dashboard.kpis.library.activeReaders} />
            </div>
          </section>

          <section>
            <h2 style={{ margin: "0 0 12px", color: "#101828" }}>Module snapshot</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12
              }}
            >
              <SnapshotCard
                title="Subscriptions"
                lines={[
                  `Active: ${dashboard.modules.subscriptions.active}`,
                  `Trialing: ${dashboard.modules.subscriptions.trialing}`,
                  `Past due: ${dashboard.modules.subscriptions.pastDue}`
                ]}
              />
              <SnapshotCard
                title="Programs"
                lines={[
                  `Published: ${dashboard.modules.programs.publishedPrograms}`,
                  `Enrollments: ${dashboard.modules.programs.activeEnrollments}`,
                  `Avg completion: ${Math.round(dashboard.modules.programs.averageCompletionPct)}%`
                ]}
              />
              <SnapshotCard
                title="Mentorship"
                lines={[
                  `Published classes: ${dashboard.modules.mentorship.publishedClasses}`,
                  `Participants: ${dashboard.modules.mentorship.activeParticipants}`,
                  `Sessions: ${dashboard.modules.mentorship.totalSessions}`
                ]}
              />
              <SnapshotCard
                title="Events"
                lines={[
                  `Published: ${dashboard.modules.events.published}`,
                  `Upcoming: ${dashboard.modules.events.upcoming}`,
                  `Registrations: ${dashboard.modules.events.registrations}`
                ]}
              />
              <SnapshotCard
                title="Notifications"
                lines={[
                  `Total: ${dashboard.modules.notifications.total}`,
                  `Unread: ${dashboard.modules.notifications.unread}`,
                  `Read rate: ${dashboard.modules.notifications.readRate}%`
                ]}
              />
              <SnapshotCard
                title="Announcements"
                lines={[
                  `Published: ${dashboard.modules.announcements.published}`,
                  `Draft: ${dashboard.modules.announcements.draft}`,
                  `Push sent: ${dashboard.modules.announcements.pushSent}`
                ]}
              />
            </div>
          </section>
        </>
      ) : null}

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, color: "#101828" }}>Growth trends (30 days)</h2>
          <Link href="/analytics" style={{ color: "#175cd3", textDecoration: "none", fontWeight: 600 }}>
            Open analytics
          </Link>
        </div>
        {growthLoading ? (
          <p style={mutedStyle}>Loading growth trends...</p>
        ) : growth ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              marginTop: 12
            }}
          >
            <TrendCard title="Revenue trend" points={growth.revenue} formatValue={formatCurrency} />
            <TrendCard title="User growth" points={growth.users} />
            <TrendCard title="Subscription growth" points={growth.subscriptions} />
            <TrendCard title="Program participation" points={growth.programEnrollments} />
            <TrendCard title="Mentorship participation" points={growth.mentorshipParticipants} />
            <TrendCard title="Event registrations" points={growth.eventRegistrations} />
          </div>
        ) : (
          <p style={mutedStyle}>No growth data available.</p>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1.2fr) minmax(260px, 1fr)",
          gap: 16
        }}
      >
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#101828" }}>Recent activity</h2>
          {activityLoading ? (
            <p style={mutedStyle}>Loading activity feed...</p>
          ) : !activity || activity.length === 0 ? (
            <p style={mutedStyle}>No recent activity yet.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {activity.map((item) => (
                <li
                  key={item.id}
                  style={{
                    borderTop: "1px solid #eaecf0",
                    padding: "12px 0"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong style={{ color: "#344054", fontSize: 12 }}>{activityLabel(item.type)}</strong>
                    <span style={{ color: "#667085", fontSize: 12 }}>{formatDateTime(item.timestamp)}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", color: "#101828", fontWeight: 600 }}>{item.title}</p>
                  <p style={{ margin: "4px 0 0", color: "#667085", fontSize: 13 }}>{item.subtitle}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#101828" }}>Top content</h2>
          {topContentLoading ? (
            <p style={mutedStyle}>Loading top content...</p>
          ) : !topContent ? (
            <p style={mutedStyle}>No top content available.</p>
          ) : (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#344054" }}>Top eBooks</h3>
              {topContent.ebooks.length === 0 ? (
                <p style={mutedStyle}>No eBook activity yet.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
                  {topContent.ebooks.map((ebook) => (
                    <li key={ebook.id} style={{ padding: "8px 0", borderTop: "1px solid #eaecf0" }}>
                      <strong style={{ color: "#101828" }}>{ebook.title}</strong>
                      <p style={{ ...mutedStyle, fontSize: 13, marginTop: 4 }}>
                        {ebook.purchases} purchases · {ebook.readers} readers
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#344054" }}>Top clips</h3>
              {topContent.clips.length === 0 ? (
                <p style={mutedStyle}>No clip views yet.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {topContent.clips.map((clip) => (
                    <li key={clip.id} style={{ padding: "8px 0", borderTop: "1px solid #eaecf0" }}>
                      <strong style={{ color: "#101828" }}>{clip.title}</strong>
                      <p style={{ ...mutedStyle, fontSize: 13, marginTop: 4 }}>
                        {clip.viewCount.toLocaleString()} views · {clip.category}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article style={cardStyle}>
      <p style={{ margin: 0, color: "#667085", fontSize: 12 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700, color: "#101828" }}>{value}</p>
      {hint ? <p style={{ ...mutedStyle, fontSize: 12, marginTop: 6 }}>{hint}</p> : null}
    </article>
  );
}

function SnapshotCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <article style={cardStyle}>
      <h3 style={{ margin: "0 0 10px", color: "#101828", fontSize: 15 }}>{title}</h3>
      {lines.map((line) => (
        <p key={line} style={{ ...mutedStyle, fontSize: 13, margin: "0 0 6px" }}>
          {line}
        </p>
      ))}
    </article>
  );
}

function TrendCard({
  title,
  points,
  formatValue
}: {
  title: string;
  points: TrendPoint[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const recent = points.slice(-7);

  return (
    <article style={cardStyle}>
      <h3 style={{ margin: "0 0 12px", color: "#101828", fontSize: 15 }}>{title}</h3>
      {recent.length === 0 ? (
        <p style={mutedStyle}>No data in selected range.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {recent.map((point) => (
            <div key={`${title}-${point.date}`}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#667085" }}>
                <span>{point.date}</span>
                <span>{formatValue ? formatValue(point.value) : point.value}</span>
              </div>
              <div
                style={{
                  marginTop: 4,
                  height: 8,
                  borderRadius: 999,
                  background: "#eaecf0",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${Math.max((point.value / max) * 100, point.value > 0 ? 8 : 0)}%`,
                    height: "100%",
                    background: "#175cd3"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
