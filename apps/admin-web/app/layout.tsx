import { ReactNode } from "react";
import type { Metadata } from "next";
import AppClientShell from "../components/app-client-shell";

type RootLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: "Men and Women of Passion and Purpose",
  description:
    "WOPP — The official app of Men and Women of Passion and Purpose. Download WOPP to stay connected.",
  openGraph: {
    title: "Men and Women of Passion and Purpose",
    description:
      "WOPP — The official app of Men and Women of Passion and Purpose. Announcements, events, mentorship, and digital resources in one place.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Men and Women of Passion and Purpose",
    description:
      "WOPP — The official app of Men and Women of Passion and Purpose. Announcements, events, mentorship, and digital resources in one place.",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AppClientShell>{children}</AppClientShell>
      </body>
    </html>
  );
}
