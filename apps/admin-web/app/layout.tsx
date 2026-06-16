import { ReactNode } from "react";
import AppClientShell from "../components/app-client-shell";

type RootLayoutProps = {
  children: ReactNode;
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
