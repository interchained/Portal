import React from "react";
import { Head, Link } from "@interchained/portal-react";
import { Nav } from "../src/components/Nav";

export const intent = {
  purpose: "Build founder trust — who we are, why we built this",
  primaryAction: "Follow our journey",
};

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <Head title="About — {{PROJECT_NAME}}" description="Who we are and why we built Portal." />
      <Nav />
      <section style={{ padding: "6rem 0" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: "2rem", letterSpacing: "-0.02em" }}>
            Why we built Portal
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            We were tired of AI writing code that breaks things silently. Every agent-assisted change felt like a gamble — useful 80% of the time, catastrophic the other 20%.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            The problem isn't the AI. The problem is that the AI doesn't know what your app is <em>supposed</em> to do. It doesn't know your brand voice, your forbidden claims, or that the phone number on the homepage needs to come from the CRM, not a training data hallucination.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            Portal solves this with a living contract. Every route declares its intent. Every agent checks its output against your goals, brand rules, and safety policies before asking for your approval.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "3rem" }}>
            The result: agents that are genuinely useful because they're constrained by what you actually care about.
          </p>
          <Link href="/" className="btn btn-primary">← Back to home</Link>
        </div>
      </section>
    </>
  );
}
