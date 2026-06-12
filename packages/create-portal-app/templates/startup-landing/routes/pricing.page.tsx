import React from "react";
import { Head, Link } from "@interchained/portal-react";
import { Nav } from "../src/components/Nav";

export const intent = {
  purpose: "Convert interest into payment — transparent pricing, no tricks",
  primaryAction: "Choose a plan",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Up to 3 routes", "portal audit", "portal generate (5/mo)", "Community support"],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    features: ["Unlimited routes", "All CLI commands", "AI improvements (unlimited)", "Sentinel review", "Priority support"],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/ month",
    features: ["Everything in Pro", "5 team members", "Custom agent configs", "Contract versioning", "SLA support"],
    cta: "Start Team",
    href: "/signup?plan=team",
    highlight: false,
  },
];

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <Head title="Pricing — {{PROJECT_NAME}}" description="Simple, transparent pricing. No hidden fees." />
      <Nav />
      <section style={{ padding: "6rem 0", textAlign: "center" }}>
        <div className="container">
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Simple pricing
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", marginBottom: "4rem" }}>
            Start free. Upgrade when you need more.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
            {PLANS.map((p) => (
              <div key={p.name} style={{
                background: p.highlight ? "linear-gradient(135deg, #312e81, #4c1d95)" : "#1e293b",
                border: `1px solid ${p.highlight ? "#6366f1" : "#334155"}`,
                borderRadius: "0.75rem",
                padding: "2rem",
                position: "relative",
              }}>
                {p.highlight && (
                  <div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)", background: "#6366f1", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.75rem", borderRadius: "0 0 0.4rem 0.4rem", letterSpacing: "0.05em" }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>{p.name}</div>
                <div style={{ fontSize: "2.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {p.price}
                  <span style={{ fontSize: "1rem", fontWeight: 400, color: "#94a3b8" }}>{p.period}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0", textAlign: "left" }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#cbd5e1", fontSize: "0.9rem", marginBottom: "0.6rem" }}>
                      <span style={{ color: "#6366f1" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} className={`btn ${p.highlight ? "btn-primary" : "btn-secondary"}`} style={{ width: "100%", justifyContent: "center" }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
