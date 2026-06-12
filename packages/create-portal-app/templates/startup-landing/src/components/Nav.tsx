import React from "react";
import { Link, useIsActive } from "@interchained/portal-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function Nav(): React.ReactElement {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e293b",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: "1.125rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "#6366f1" }}>⬡</span> {{PROJECT_NAME}}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
          <Link href="/signup" className="btn btn-primary" style={{ marginLeft: "0.75rem", padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}>
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }): React.ReactElement {
  const active = useIsActive(href);
  return (
    <Link
      href={href}
      style={{
        padding: "0.4rem 0.75rem",
        borderRadius: "0.375rem",
        fontSize: "0.9rem",
        fontWeight: 500,
        color: active ? "#f8fafc" : "#94a3b8",
        background: active ? "#1e293b" : "transparent",
        transition: "color 0.15s, background 0.15s",
      }}
    >
      {label}
    </Link>
  );
}
