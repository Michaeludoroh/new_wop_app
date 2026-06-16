"use client";

import { ReactNode } from "react";
import AuthGate from "./auth-gate";
import { UserRole } from "../lib/auth/types";

type ProtectedModuleProps = {
  children: ReactNode;
  allowedRoles: UserRole[];
};

export default function ProtectedModule({ children, allowedRoles }: ProtectedModuleProps) {
  return <AuthGate roles={allowedRoles}>{children}</AuthGate>;
}
