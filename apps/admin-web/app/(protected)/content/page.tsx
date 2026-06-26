"use client";

import Link from "next/link";
import ProtectedModule from "../../../components/protected-module";

const modules = [
  { href: "/announcements", label: "Announcements", description: "Create and publish announcements" },
  { href: "/clips", label: "Clips", description: "Manage video clips and media" },
  { href: "/ebooks", label: "eBooks", description: "Manage digital library resources" },
  { href: "/policies", label: "Policies", description: "Publish governance policies" },
  { href: "/events", label: "Events", description: "Manage community events" },
  { href: "/programs", label: "Programs", description: "Manage empowerment programs" },
  { href: "/mentorship", label: "Mentorship", description: "Manage mentorship classes" }
];

export default function ContentPage() {
  return (
    <ProtectedModule allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}>
      <div style={{ display: "grid", gap: 20 }}>
        <section>
          <h1>Content Management</h1>
          <p>Open a module below to manage announcements, clips, eBooks, policies, and related content.</p>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              style={{
                display: "block",
                border: "1px solid #eaecf0",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit"
              }}
            >
              <strong>{module.label}</strong>
              <p style={{ margin: "8px 0 0", color: "#667085" }}>{module.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedModule>
  );
}
