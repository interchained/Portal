import React from "react";
import { Head, Link } from "@interchained/portal-react";

export const intent = {
  purpose: "Welcome visitors and communicate the core value proposition",
  primaryAction: "Get started",
};

export default function HomePage(): React.ReactElement {
  return (
    <>
      <Head
        title="{{PROJECT_NAME}}"
        description="Built with Portal — the agent-native web framework."
      />
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⬡</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, margin: "0 0 1rem", background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {{PROJECT_NAME}}
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.6, marginBottom: "2.5rem" }}>
          Built on Portal — the agent-native web framework where apps have a living contract and agents can safely improve them.
        </p>
        <Link
          href="/about"
          style={{ display: "inline-block", padding: "0.75rem 2rem", background: "#6366f1", color: "#fff", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600, fontSize: "1rem" }}
        >
          Get started →
        </Link>
        <p style={{ marginTop: "3rem", fontSize: "0.875rem", color: "#475569" }}>
          Edit <code style={{ background: "#1e293b", padding: "0.2em 0.4em", borderRadius: "0.25rem" }}>routes/index.page.tsx</code> to get started.
        </p>
      </main>
    </>
  );
}
