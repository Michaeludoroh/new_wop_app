"use client";

import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";
import { UserRole } from "../lib/auth/types";

type AuthGateProps = {
  children: ReactNode;
  roles?: UserRole[];
  fallback?: ReactNode;
};

export default function AuthGate({ children, roles, fallback }: AuthGateProps) {
  const { isInitializing, isAuthenticated, user } = useAuth();
  const debugAuthGate = process.env.NEXT_PUBLIC_DEBUG_AUTH_GATE === "true";

  if (isInitializing) {
    return (
      <div style={{ padding: 24, color: "#475467" }}>
        <p style={{ margin: 0 }}>Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return fallback ?? null;
  }

  const normalizeRole = (role: string | undefined | null): UserRole | null => {
    if (!role) return null;
    const normalized = role.toUpperCase().replace(/[-\s]/g, "_");
    if (normalized === "SUPERADMIN") return "SUPER_ADMIN";
    if (normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
    if (normalized === "ADMIN") return "ADMIN";
    if (normalized === "MODERATOR") return "MODERATOR";
    if (normalized === "USER") return "USER";
    return null;
  };

  const userRole = normalizeRole(user.role);

  if (debugAuthGate) {
    console.info("[auth-gate] role-evidence", {
      rawUserRole: user.role,
      normalizedUserRole: userRole,
      allowedRoles: roles ?? []
    });
  }

  if (roles && roles.length > 0 && (!userRole || !roles.includes(userRole))) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0, color: "#101828" }}>Unauthorized</h2>
        <p style={{ color: "#475467", marginBottom: 0 }}>
          You do not have permission to access this module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
