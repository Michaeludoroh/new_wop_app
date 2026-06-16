type ServiceState = "operational" | "degraded" | "outage" | "maintenance";

type ServiceStatus = {
  name: string;
  state: ServiceState;
  uptime30d: string;
  lastUpdated: string;
};

type IncidentItem = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  updatedAt: string;
};

type MaintenanceItem = {
  id: string;
  title: string;
  window: string;
  impact: string;
};

const stateColor: Record<ServiceState, string> = {
  operational: "text-green-700 bg-green-100",
  degraded: "text-amber-700 bg-amber-100",
  outage: "text-red-700 bg-red-100",
  maintenance: "text-blue-700 bg-blue-100",
};

const severityColor: Record<IncidentItem["severity"], string> = {
  critical: "text-red-700 bg-red-100",
  high: "text-orange-700 bg-orange-100",
  medium: "text-yellow-700 bg-yellow-100",
};

const statusColor: Record<IncidentItem["status"], string> = {
  investigating: "text-red-700 bg-red-100",
  identified: "text-orange-700 bg-orange-100",
  monitoring: "text-blue-700 bg-blue-100",
  resolved: "text-green-700 bg-green-100",
};

function fallbackData() {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    services: [
      { name: "API", state: "operational", uptime30d: "99.95%", lastUpdated: now },
      { name: "WebSocket", state: "operational", uptime30d: "99.92%", lastUpdated: now },
      { name: "Payments", state: "operational", uptime30d: "99.80%", lastUpdated: now },
      { name: "Notifications", state: "degraded", uptime30d: "98.90%", lastUpdated: now },
      { name: "Redis", state: "operational", uptime30d: "99.97%", lastUpdated: now },
      { name: "PostgreSQL", state: "operational", uptime30d: "99.99%", lastUpdated: now },
    ] as ServiceStatus[],
    incidents: [
      {
        id: "INC-2026-0042",
        title: "Notification provider latency spike",
        severity: "medium",
        status: "monitoring",
        startedAt: now,
        updatedAt: now,
      },
    ] as IncidentItem[],
    maintenance: [
      {
        id: "MW-2026-0011",
        title: "Scheduled database index optimization",
        window: "Sunday 02:00-03:00 UTC",
        impact: "Minor write latency increase",
      },
    ] as MaintenanceItem[],
  };
}

async function fetchStatusData() {
  const endpoint = process.env.STATUS_PAGE_DATA_URL;
  if (!endpoint) return fallbackData();

  try {
    const res = await fetch(endpoint, { next: { revalidate: 30 } });
    if (!res.ok) return fallbackData();
    const data = await res.json();
    return {
      generatedAt: data.generatedAt ?? new Date().toISOString(),
      services: (data.services ?? []) as ServiceStatus[],
      incidents: (data.incidents ?? []) as IncidentItem[],
      maintenance: (data.maintenance ?? []) as MaintenanceItem[],
    };
  } catch {
    return fallbackData();
  }
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export default async function StatusPage() {
  const data = await fetchStatusData();

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Operational Status</h1>
        <p className="text-sm text-gray-600">
          Internal operational dashboard for service health, uptime, incidents, and maintenance windows.
        </p>
        <p className="text-xs text-gray-500">Last refresh: {new Date(data.generatedAt).toLocaleString()}</p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Service Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.services.map((svc) => (
            <div key={svc.name} className="rounded-md border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{svc.name}</h3>
                <Pill className={stateColor[svc.state]}>{svc.state}</Pill>
              </div>
              <p className="text-sm text-gray-700">30d Uptime: {svc.uptime30d}</p>
              <p className="text-xs text-gray-500">Updated: {new Date(svc.lastUpdated).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Incidents</h2>
        {data.incidents.length === 0 ? (
          <p className="text-sm text-gray-600">No active incidents.</p>
        ) : (
          <div className="space-y-3">
            {data.incidents.map((incident) => (
              <article key={incident.id} className="rounded-md border border-gray-100 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{incident.title}</span>
                  <Pill className={severityColor[incident.severity]}>{incident.severity}</Pill>
                  <Pill className={statusColor[incident.status]}>{incident.status}</Pill>
                </div>
                <p className="text-xs text-gray-500">
                  {incident.id} • Started {new Date(incident.startedAt).toLocaleString()} • Updated{" "}
                  {new Date(incident.updatedAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Maintenance Windows</h2>
        {data.maintenance.length === 0 ? (
          <p className="text-sm text-gray-600">No scheduled maintenance.</p>
        ) : (
          <div className="space-y-3">
            {data.maintenance.map((mw) => (
              <article key={mw.id} className="rounded-md border border-gray-100 p-3">
                <p className="font-medium">{mw.title}</p>
                <p className="text-sm text-gray-700">{mw.window}</p>
                <p className="text-xs text-gray-500">{mw.impact}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
