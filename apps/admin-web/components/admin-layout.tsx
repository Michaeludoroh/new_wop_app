"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";
import { adminNavLinks } from "./nav-links";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, user, logout } = useAuth();

  if (pathname === "/login" || pathname === "/sermon") {
    return <>{children}</>;
  }

  if (isInitializing) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#475467" }}>
        Restoring session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const filteredLinks = adminNavLinks.filter((item) => item.roles.includes(user.role));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial, sans-serif", background: "#f7f8fa" }}>
      <aside
        style={{
          width: 260,
          background: "#101828",
          color: "#fff",
          padding: "20px 14px",
          boxSizing: "border-box"
        }}
      >
        <h2 style={{ margin: "0 0 8px 6px", fontSize: 18 }}>Ministry Admin</h2>
        <p style={{ margin: "0 0 16px 6px", color: "#98a2b3", fontSize: 12 }}>
          {user.fullName} ({user.role})
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: active ? "#101828" : "#e4e7ec",
                  background: active ? "#d1e9ff" : "transparent",
                  textDecoration: "none",
                  padding: "9px 10px",
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div style={{ flex: 1 }}>
        <header
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #eaecf0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            boxSizing: "border-box"
          }}
        >
          <strong style={{ color: "#101828" }}>Admin Dashboard</strong>
          <button
            onClick={logout}
            style={{
              border: "1px solid #d0d5dd",
              borderRadius: 8,
              background: "#fff",
              color: "#344054",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </header>
        <main style={{ padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}
