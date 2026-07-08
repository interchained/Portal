# ⬡ Portal

**The agent-native web framework.**

> Not a Next.js clone. A different category: every app has a **living contract**, agents check every change against business goals and brand rules, and no patch lands without human approval.

```bash
npm create @interchained/portal-app my-site
cd my-site
portal dev
portal audit
portal generate page "Father's Day promo"
```

---

## Why Portal exists

Most frameworks ask: *"How do we render this route?"*

Portal asks: *"What is this app trying to accomplish — and is the current implementation faithful to that?"*

The developer defines the contract. Agents generate, audit, and improve the implementation. The runtime keeps the app observable, safe, and self-improving.

---

## The living contract

Every Portal app has an `app.contract.ts` at its root:

```ts
// app.contract.ts
export default defineApp({
  name: "Mint Salon",

  goals: [
    "Help clients book appointments",
    "Showcase stylist expertise",
    "Capture leads via SMS opt-in",
  ],

  brand: {
    voice: "warm, polished, Aveda-aligned",
    colors: ["#0f2f27", "#d8c7a3"],
    forbiddenPhrases: ["cheap", "discount", "deal"],
  },

  data: {
    services:  "./data/services.csv",
    stylists:  "./data/stylists.json",
  },

  policies: {
    publishing:    "human_review",   // every AI patch needs your OK
    seo:           true,
    accessibility: "strict",
    forbiddenClaims: ["medical benefits", "guaranteed results"],
  },

  pages: [
    {
      route:         "/",
      purpose:       "Convert salon visitors into booking leads",
      audience:      "Winter Park salon clients",
      primaryAction: "Text 833-390-0226",
      seoKeyword:    "Aveda salon Winter Park",
    },
  ],
});
```

This becomes the source of truth for every agent command.

---

## File-based routing

Every `*.page.tsx` in `routes/` is a route:

```
routes/
  index.page.tsx          →  /
  services.page.tsx       →  /services
  blog/[slug].page.tsx    →  /blog/:slug
  booking/index.page.tsx  →  /booking
```

Each page can declare its intent:

```ts
export const intent = {
  purpose: "Convert visitors into bookings",
  primaryAction: "Book now",
  seoKeyword: "Aveda salon Winter Park",
};
```

Agents read both the contract and the intent to know what the page is for — and whether it's doing its job.

---

## CLI commands

### `portal dev`
Starts the Vite dev server. File changes and contract changes hot-reload automatically.

### `portal build`
Builds for production. Node and static output supported.

### `portal audit`
Runs all checks and reports findings:

```
$ portal audit

SEO
✓ routes/index.page.tsx
⚠ routes/services.page.tsx
   Missing target SEO keyword "Aveda salon Winter Park"
   Fix: Include keyword naturally in headings or body copy

BRAND
✗ routes/about.page.tsx
   Forbidden phrase found: "best-in-class"
   Fix: Remove or replace this phrase

Summary: 4 passed  ·  2 warnings  ·  1 failed

Run portal improve to auto-fix these issues.
```

Add `--ai` for deeper AI-assisted analysis. Use `--json` for CI.

### `portal improve`
Generates targeted patches for audit findings. Shows you a diff, waits for your approval:

```
$ portal improve --target seo

[SEO] routes/services.page.tsx
  Missing target SEO keyword

Sentinel: Patch adds keyword to h1 and meta description. No violations.

─── diff ───────────────────────────────────────────
- <h1>Our Services</h1>
+ <h1>Aveda Salon Services — Winter Park</h1>
────────────────────────────────────────────────────

? Apply this patch?  ✓ Apply  ~ Skip  ✗ Reject
```

### `portal generate`
Creates new pages from a description. The agent reads your contract and writes a component that serves your goals:

```bash
portal generate page "Father's Day gift card promo"
portal generate landing "Aveda color correction specialist"
portal generate page "About our stylists" --route /team
```

### `portal guard`
Runs safety checks on all pending patches before they can be applied:

- No hallucinated phone numbers or emails
- No changed brand colors without approval  
- No forbidden claims from your policy
- No off-brand phrases

---

## Agent architecture

Portal uses a **runner + sentinel** two-model pattern:

```
User prompt
     ↓
 [ Runner ]  — fast, cheap, first-pass generation (AiAssist.net)
     ↓
 [ Sentinel ] — reviews runner output against your contract
     ↓
 [ Human approval ] — diff preview, approve / skip / reject
     ↓
 [ Guard ] — final safety check before write
     ↓
  File written
```

The runner does the work. The sentinel catches mistakes. You make the final call.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | File-based, built-in |
| Agent API | AiAssist.net (OpenAI-compatible) |
| Styling | Tailwind CSS (or plain CSS) |
| Output | Static, Node SSR, Docker |

---

## Packages

| Package | Description |
|---------|-------------|
| `@interchained/portal-contract` | `defineApp`, `defineAgent`, all contract types |
| `@interchained/portal-agent` | Runner, Sentinel, audit, generate, improve, guard |
| `@interchained/portal-core` | Vite plugin, file-based routing |
| `@interchained/portal-react` | PortalProvider, Router, Link, Head, hooks |
| `portal-cli` | The `portal` CLI binary |
| `@interchained/create-portal-app` | `npm create @interchained/portal-app` scaffolder |
| `@interchained/portal-source-wordpress` | WordPress Portal Bridge source adapter — WordPress backend, Portal frontend |

---

## WordPress backend? Keep it.

Portal speaks [WP Portal Bridge](https://github.com/interchained/wp-portal-bridge): install the plugin on any WordPress site, copy two env vars, and `portal serve` renders the public site from WordPress-backed content through an HMAC-signed tunnel — snapshot-first, SEO-preserving, resilient to the backend going down.

```bash
PORTAL_BRIDGE_BASE_URL=https://cms.example.com
PORTAL_TMK=portal_tmk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
portal serve
```

Clients keep editing in the WordPress admin they know. Visitors get Portal. Paths, titles, meta, canonicals — everything the site earned is preserved. See `examples/wordpress-bridge/`.

---

## Environment variables

```bash
AIASSIST_API_KEY=...   # or VITE_AIAS_API_KEY
```

WordPress bridge (optional): `PORTAL_BRIDGE_BASE_URL`, `PORTAL_TMK` — see above.

That's it. No blockchain required. No hosting lock-in.

---

## Templates

### `blank`
Bare minimum Portal app. One route, one contract, zero opinions.

### `startup-landing`
High-converting SaaS landing page with:
- Hero + features + pricing + about
- Sticky nav with active states
- Opinionated contract with real business goals
- Forbidden phrases and claim guard rails

More templates coming: `salon-site`, `crypto-dashboard`, `docs-portal`.

---

## License

GPL-3.0-or-later · [Interchained](https://interchained.org)
