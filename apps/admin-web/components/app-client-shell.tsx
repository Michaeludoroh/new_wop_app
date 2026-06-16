"use client";

import { ReactNode } from "react";
import { AuthProvider } from "../providers/auth-provider";
import { AppQueryProvider } from "../providers/query-provider";

type AppClientShellProps = {
  children: ReactNode;
};

export default function AppClientShell({ children }: AppClientShellProps) {
  return (
    <AppQueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </AppQueryProvider>
  );
}
