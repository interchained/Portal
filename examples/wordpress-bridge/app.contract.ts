/**
 * Example contract: WordPress backend, Portal frontend.
 * The `source` block declares where content lives; the bridge env vars
 * (PORTAL_BRIDGE_BASE_URL, PORTAL_TMK) activate it at runtime.
 */
import { defineApp } from "@interchained/portal-contract";

export default defineApp({
  name: "WordPress Bridge Example",
  description: "WordPress stays the backend. Portal renders the public site.",

  goals: [
    "Serve WordPress-authored content fast, modern, and SEO-safe",
    "Preserve every URL, title, and meta description the site has earned",
  ],

  source: {
    type: "wordpress-portal-bridge",
    baseUrlEnv: "PORTAL_BRIDGE_BASE_URL",
    tmkEnv: "PORTAL_TMK",
    mode: "snapshot-first",
  },

  seo: {
    enabled: true,
    sitemap: true,
  },

  policies: {
    publishing: "human_review",
  },
});
