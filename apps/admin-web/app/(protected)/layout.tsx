"use client";

import { ReactNode } from "react";
import AdminLayout from "../../components/admin-layout";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}
