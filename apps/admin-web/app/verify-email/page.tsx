"use client";

import { useEffect, useState } from "react";
import { API_CONFIG } from "../../lib/auth/config";

type VerifyState = "loading" | "success" | "already" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token")?.trim();

    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          `${API_CONFIG.baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const payload = (await response.json()) as {
          message?: string;
          alreadyVerified?: boolean;
        };

        if (!response.ok) {
          setState("error");
          setMessage(payload.message ?? "Invalid or expired verification link.");
          return;
        }

        if (payload.alreadyVerified) {
          setState("already");
          setMessage("Your email was already verified. You can sign in to the app.");
          return;
        }

        setState("success");
        setMessage("Your email has been verified. Premium access is now available in the app.");
      } catch {
        setState("error");
        setMessage("Could not verify your email. Please try again or request a new link.");
      }
    })();
  }, []);

  const color =
    state === "success" || state === "already" ? "#027a48" : state === "error" ? "#b42318" : "#667085";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8f9fc"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          border: "1px solid #eaecf0",
          borderRadius: 12,
          padding: 32
        }}
      >
        <h1 style={{ marginTop: 0 }}>Email Verification</h1>
        <p style={{ color, lineHeight: 1.6 }}>{message}</p>
        {state === "success" || state === "already" ? (
          <p style={{ color: "#667085" }}>
            Return to the WOPP mobile app and tap Continue on the verification screen.
          </p>
        ) : null}
      </section>
    </main>
  );
}
