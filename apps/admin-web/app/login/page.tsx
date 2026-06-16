"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../../providers/auth-provider";

export default function LoginPage() {
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    await login({ email, password });
  }

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f2f4f7"
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #eaecf0",
          borderRadius: 12,
          padding: 24,
          boxSizing: "border-box"
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8, color: "#101828" }}>Admin Login</h1>
        <p style={{ marginTop: 0, color: "#475467", fontSize: 14 }}>
          Sign in to continue to the ministry administration dashboard.
        </p>

        <label style={{ display: "block", marginBottom: 8, color: "#344054", fontSize: 13 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            height: 40,
            borderRadius: 8,
            border: "1px solid #d0d5dd",
            padding: "0 12px",
            boxSizing: "border-box",
            marginBottom: 12
          }}
        />

        <label style={{ display: "block", marginBottom: 8, color: "#344054", fontSize: 13 }}>
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            height: 40,
            borderRadius: 8,
            border: "1px solid #d0d5dd",
            padding: "0 12px",
            boxSizing: "border-box",
            marginBottom: 16
          }}
        />

        {error ? (
          <div
            style={{
              marginBottom: 12,
              color: "#b42318",
              background: "#fef3f2",
              border: "1px solid #fecdca",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 8,
            border: 0,
            background: "#155eef",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}


