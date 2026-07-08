# @interchained/portal-source-wordpress

**WordPress as your backend. Portal as your frontend. HMAC-secured bridge between them.**

The Portal side of [WP Portal Bridge](https://github.com/Eth-Interchained/wp-portal-bridge): clients keep the WordPress admin they already know — pages, posts, media, menus, Yoast/Rank Math/AIOSEO — while Portal renders the site their visitors actually see. Lean, fast, cacheable, SEO-safe, authority-preserving.

```
WordPress Admin → wp-portal-bridge plugin → signed contract API
              → this adapter → Portal renderer → fast public website
```

## Setup — two env vars

Install [wp-portal-bridge](https://github.com/Eth-Interchained/wp-portal-bridge) on the WordPress site, click **Connect Portal Frontend**, copy the env block:

```bash
PORTAL_BRIDGE_BASE_URL=https://cms.example.com
PORTAL_TMK=portal_tmk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`portal serve` detects the env and activates the bridge automatically: WordPress-backed routes render server-side ahead of the SPA fallback, `/sitemap.xml` is generated from the source, and every URL path WordPress earned is preserved exactly.

## API

```ts
import { wordpressPortalBridgeFromEnv } from "@interchained/portal-source-wordpress";

const source = wordpressPortalBridgeFromEnv();
await source.ready();                      // store-first, tunnel when empty

const route = await source.resolve("/about/");  // deterministic slash-toggle lookup
source.site(); source.menus(); source.routes(); source.sitemapEntries();
```

Explicit config, all nine capabilities:

```ts
import { wordpressPortalBridge, BridgeClient } from "@interchained/portal-source-wordpress";

const source = wordpressPortalBridge({ baseUrl, tmk, mode: "snapshot-first" });
const client = new BridgeClient({ baseUrl, tmk });
// getHealth · getSite · getRoutes · getRoute · getMenus
// getAssets · getTaxonomies · getSitemap · getSnapshot (auto-merges 413 chunks)
```

## The tunnel

Every request is signed (**PORTAL-BRIDGE-V1**): raw request target exactly as sent, timestamped, nonce-unique, body-hashed, HMAC-SHA256 with `PORTAL_TMK`. Response signatures (**PORTAL-BRIDGE-RESPONSE-V1**) are verified when present. The key id is derived from the TMK (`wpb_` + sha256 prefix), so two env vars are the entire configuration. Redirects are never followed — they change the signed target by design.

Both implementations (this package and the PHP plugin) are asserted against the same golden vectors. Drift on either side fails that side's tests.

**`PORTAL_TMK` is server-side only. Never import this package in browser code.**

## Snapshot-first (the production mode)

- Boot from the last-good snapshot; fetch through the tunnel when the store is empty
- Requests resolve from memory — zero WordPress round-trips on the hot path
- Past the TTL (`PORTAL_BRIDGE_CACHE_TTL`, default 300s): background refresh, requests never block
- **WordPress down → the last-good snapshot keeps serving indefinitely**

Live mode (`PORTAL_BRIDGE_MODE=live`) resolves per-request through the tunnel and still falls back to the snapshot on failure.

## Snapshot persistence — NEDB first

```bash
PORTAL_BRIDGE_NEDB_URL=http://127.0.0.1:7070   # or NEDB_URL; NEDBD_TOKEN if gated
```

With a [nedbd](https://github.com/Eth-Interchained/nedb) reachable, snapshots persist to NEDB: every save is an append to a BLAKE2b hash-chained log, cites the chain head it extends (`caused_by`), passes verify-after-write, and the engine's `verify` proves the history untouched — versioned, tamper-evident, `AS OF`-replayable. This is the on-ramp to the NEDB snapshot ledger.

Without NEDB, a plain file (`.portal/bridge-snapshot.json`) holds the last-good snapshot. Custom backends implement the two-method `SnapshotStore` interface.

*(Client WordPress sites keep whatever database WordPress runs on — MySQL, MariaDB, anything. That side is reached only through WordPress APIs and never changes.)*

## Rendering

`renderRouteHtml(route, site, menus, options)` produces a complete, zero-JS-required document: earned SEO applied exactly (title, description, canonical, OG, Twitter, robots, honest modified times), nav from WordPress menus, content sanitized (scripts/handlers/scriptable-URLs stripped, Gutenberg markup preserved) inside a scoped `.wp-bridge-content` with a minimal block-compatibility stylesheet. `PORTAL_BRIDGE_PUBLIC_ORIGIN` re-roots canonicals/sitemap onto the public domain, paths untouched.

## Failure behavior

Missing/malformed env → `BridgeConfigError`, serve refuses to boot. Tunnel rejection → `BridgeAuthError`. Tampered response → `BridgeIntegrityError`. Oversized snapshot → chunked automatically. WordPress unreachable → last-good snapshot.

## Test

```bash
pnpm test   # golden vectors + mock-tunnel behavior + sanitizer policy
```

GPL-3.0-or-later · © Interchained
