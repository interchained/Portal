# WordPress backend → Portal frontend

The smallest complete WP Portal Bridge setup. WordPress stays the admin panel
your client already knows; Portal renders the site their visitors see.

## The loop this example proves

1. A client edits a page in **WordPress Admin**.
2. The [wp-portal-bridge](https://github.com/Eth-Interchained/wp-portal-bridge)
   plugin exposes that page through the signed contract API.
3. Portal reads `PORTAL_BRIDGE_BASE_URL` + `PORTAL_TMK` and signs every request
   (PORTAL-BRIDGE-V1 — HMAC-SHA256, timestamped, nonce-replay-protected).
4. WordPress verifies the signature and returns the route contract.
5. `portal serve` renders the page publicly — title, meta description,
   canonical, Open Graph, robots, content, and **the exact URL path** preserved.

## Run it

```bash
# 1. On the WordPress site: install wp-portal-bridge, then
#    WP Admin → Portal Bridge → Connect Portal Frontend → copy the env block.

# 2. Here:
cp .env.example .env        # paste your values
set -a; source .env; set +a

# 3. Serve (snapshot-first: boots from the last-good snapshot, refreshes on TTL)
portal serve --dir dist
```

Visit `http://localhost:4173/` — the WordPress front page, server-rendered by
Portal. Every path WordPress publishes resolves; everything else falls through
to the static shell in `dist/`. `/sitemap.xml` is generated from the source.

## Env reference

| Variable | Required | Meaning |
|---|---|---|
| `PORTAL_BRIDGE_BASE_URL` | ✔ | Canonical WordPress origin (no redirects) |
| `PORTAL_TMK` | ✔ | Tunnel Master Key from the plugin (server-side only) |
| `PORTAL_BRIDGE_MODE` | | `snapshot-first` (default) or `live` |
| `PORTAL_BRIDGE_CACHE_TTL` | | Snapshot staleness TTL in seconds (default 300) |
| `PORTAL_BRIDGE_NEDB_URL` / `NEDB_URL` | | Persist last-good snapshots in NEDB (nedbd) — versioned, hash-chained, tamper-evident |
| `PORTAL_BRIDGE_PUBLIC_ORIGIN` | | Public origin for canonical/sitemap re-rooting |
| `PORTAL_BRIDGE_SNAPSHOT_PATH` | | File-store fallback path (default `.portal/bridge-snapshot.json`) |
| `PORTAL_BRIDGE_DISABLE` | | `1` to hard-disable the bridge |

**Snapshot persistence:** with a nedbd reachable, every snapshot save is an
append to a BLAKE2b hash-chained log citing the chain head it extends
(`caused_by`) — tamper-evident history, `AS OF` time-travel over past
snapshots, `verify` proof the record is untouched. Without NEDB, a plain file
keeps the last-good snapshot. Client sites keep whatever database WordPress
runs on — that side never changes.

## Failure behavior (by design)

- WordPress unreachable → the last-good snapshot keeps serving indefinitely.
- Missing/malformed env → `portal serve` refuses to boot, with a clear message.
- Tampered responses → rejected (`PORTAL-BRIDGE-RESPONSE-V1` verification).
- Unsigned requests at the WordPress side → generic 401, rate-limited.
