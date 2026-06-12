import React from "react";
import { Head, Link } from "@interchained/portal-react";
import { Nav } from "../src/components/Nav";

export const intent = {
  purpose: "Land visitors, communicate core value, drive sign-ups",
  audience: "Early adopters and startup founders",
  primaryAction: "Start free trial",
  seoKeyword: "{{PROJECT_NAME}}",
};

const FEATURES = [
  { icon: "⬡", title: "Contract-first", body: "Define what your app is supposed to do. Agents check every change against your goals, brand, and safety rules." },
  { icon: "🔍", title: "Continuous audit", body: "Run portal audit to instantly see SEO gaps, missing CTAs, brand violations, and accessibility issues." },
  { icon: "✨", title: "AI improvements", body: "portal improve generates targeted patches. Review each diff, approve what you want, discard the rest." },
  { icon: "🛡️", title: "Guard rails", body: "portal guard blocks hallucinated data, forbidden phrases, and off-brand changes before they ever touch production." },
];

const STEPS = [
  { cmd: "npm create portal-app", label: "Scaffold your app" },
  { cmd: "portal dev",            label: "Start local dev server" },
  { cmd: "portal audit",          label: "See what needs fixing" },
  { cmd: "portal generate page \"Your page idea\"", label: "Ship with AI in seconds" },
];

export default function HomePage(): React.ReactElement {
  return (
    <>
      <Head
        title="{{PROJECT_NAME}} — Agent-native web framework"
        description="Build high-converting portals where agents can safely audit, improve, and generate pages — always against your living app contract."
      />
      <Nav />

      {/* Hero */}
      <section style={{ padding: "7rem 0 5rem", textAlign: "center" }}>
        <div className="container">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "999px", padding: "0.35rem 1rem", fontSize: "0.8rem", color: "#a78bfa", marginBottom: "2rem" }}>
            <span>⚡</span> Agent-native web framework
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
            The web framework that{" "}
            <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              builds itself
            </span>
          </h1>
          <p style={{ fontSize: "1.2rem", color: "#94a3b8", maxWidth: "560px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            Define your app's contract. Let agents audit, improve, and generate pages — always checked against your goals, brand, and safety rules.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: "1.05rem" }}>
              Start for free →
            </Link>
            <Link href="/docs" className="btn btn-secondary">
              Read the docs
            </Link>
          </div>
          {/* Terminal preview */}
          <div style={{ marginTop: "4rem", background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "left", maxWidth: "580px", margin: "4rem auto 0", fontFamily: "monospace", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
              {["#ff5f56","#ffbd2e","#27c93f"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, display: "inline-block" }} />)}
            </div>
            {STEPS.map((s) => (
              <div key={s.cmd} style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "#6366f1" }}>$ </span>
                <span style={{ color: "#f8fafc" }}>{s.cmd}</span>
                <div style={{ color: "#475569", fontSize: "0.8rem", paddingLeft: "1.25rem" }}>✓ {s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "5rem 0", borderTop: "1px solid #1e293b" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, marginBottom: "3.5rem", letterSpacing: "-0.01em" }}>
            The framework that knows what your app is <em>supposed</em> to do
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "0.75rem", padding: "1.75rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ color: "#94a3b8", margin: 0, lineHeight: 1.6, fontSize: "0.9rem" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "6rem 0", textAlign: "center", borderTop: "1px solid #1e293b" }}>
        <div className="container">
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Build the door first.
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", marginBottom: "2rem" }}>
            Your app deserves a contract. Start in 30 seconds.
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: "1.05rem" }}>
            npm create portal-app →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", padding: "2rem 0", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
        <div className="container">
          <span style={{ color: "#6366f1" }}>⬡</span>{" "}
          Portal by{" "}
          <a href="https://interchained.org" style={{ color: "#6366f1" }}>Interchained</a>
          {" "}· GPL-3.0
        </div>
      </footer>
    </>
  );
}
