/**
 * WordPressBridgeSource — snapshot-first orchestration.
 *
 * Snapshot-first is the v0 production mode and the hard success gate:
 *
 *   boot     → load last-good snapshot from the store; if none, fetch the
 *              full snapshot through the tunnel and persist it
 *   request  → resolve routes from the in-memory snapshot (fast, no WP
 *              round-trip), deterministic trailing-slash normalization
 *   staleness→ when the TTL lapses, refresh in the background; requests keep
 *              serving the current snapshot — never block the hot path
 *   WP down  → keep serving the last-good snapshot indefinitely; refresh
 *              retries on the next stale request
 *
 * Live mode (opt-in) resolves each miss through GET /route while still
 *   falling back to the snapshot when WordPress is unreachable.
 */
import { FileSnapshotStore } from "./cache.js";
export class WordPressBridgeSource {
    mode;
    client;
    store;
    ttlMs;
    log;
    stored = null;
    routesByPath = new Map();
    refreshing = null;
    constructor(options) {
        this.client = options.client;
        this.store = options.store ?? new FileSnapshotStore();
        this.mode = options.mode ?? "snapshot-first";
        this.ttlMs = (options.cacheTtl ?? 300) * 1000;
        this.log = options.log ?? (() => { });
    }
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    /**
     * Ensure a snapshot is available. Store first; tunnel when the store is
     * empty. Throws only when BOTH are unavailable — a bridge with neither a
     * last-good snapshot nor a reachable WordPress cannot serve.
     */
    async ready() {
        if (this.stored)
            return;
        const fromStore = await this.store.load();
        if (fromStore) {
            this.adopt(fromStore, "store");
            // Snapshot from a previous process may be stale — refresh opportunistically.
            this.refreshIfStale();
            return;
        }
        await this.refresh();
    }
    /** Fetch a fresh snapshot through the tunnel and persist it as last-good. */
    async refresh() {
        const snapshot = await this.client.getSnapshot();
        const stored = { snapshot, fetchedAt: Date.now() };
        this.adopt(stored, "tunnel");
        try {
            await this.store.save(stored);
        }
        catch (error) {
            // Persistence failure must not take down serving — log and continue.
            this.log(`bridge: snapshot persisted FAILED (${error.message}) — serving from memory`);
        }
    }
    /** Kick a background refresh when the snapshot is past its TTL. */
    refreshIfStale() {
        if (!this.stored)
            return;
        if (Date.now() - this.stored.fetchedAt <= this.ttlMs)
            return;
        if (this.refreshing)
            return;
        this.refreshing = this.refresh()
            .catch((error) => {
            this.log(`bridge: refresh failed (${error.message}) — serving last-good snapshot from ${new Date(this.stored?.fetchedAt ?? 0).toISOString()}`);
        })
            .finally(() => {
            this.refreshing = null;
        });
    }
    adopt(stored, origin) {
        this.stored = stored;
        this.routesByPath.clear();
        for (const route of stored.snapshot.routes) {
            this.routesByPath.set(route.path, route);
        }
        this.log(`bridge: snapshot ${stored.snapshot.snapshotId} adopted from ${origin} — ${stored.snapshot.routeCount} routes, hash ${stored.snapshot.contentHash.slice(0, 12)}…`);
    }
    // ── Resolution ────────────────────────────────────────────────────────────
    /**
     * Resolve a public path to a route. Deterministic normalization: exact
     * match, then the trailing-slash toggle. Snapshot-first answers from
     * memory; live mode asks WordPress and falls back to the snapshot.
     */
    async resolve(path) {
        this.refreshIfStale();
        const fromSnapshot = this.lookup(path);
        if (this.mode === "snapshot-first")
            return fromSnapshot;
        // live mode
        try {
            return await this.client.getRoute(path);
        }
        catch {
            return fromSnapshot; // WordPress down or 404 → last-good behavior.
        }
    }
    lookup(path) {
        const normalized = "/" + (path.replace(/^\/+/, "") || "");
        const exact = this.routesByPath.get(normalized);
        if (exact)
            return exact;
        const toggled = normalized !== "/" && normalized.endsWith("/")
            ? normalized.replace(/\/+$/, "")
            : `${normalized}/`;
        return this.routesByPath.get(toggled) ?? null;
    }
    // ── Views over the snapshot ───────────────────────────────────────────────
    snapshot() {
        return this.stored?.snapshot ?? null;
    }
    site() {
        return this.stored?.snapshot.site ?? null;
    }
    menus() {
        return this.stored?.snapshot.menus ?? [];
    }
    routes() {
        return this.stored?.snapshot.routes ?? [];
    }
    sitemapEntries() {
        const snapshot = this.stored?.snapshot;
        if (!snapshot)
            return [];
        return snapshot.routes.map((route) => ({
            loc: new URL(route.path, snapshot.source.homeUrl).toString(),
            path: route.path,
            lastmod: route.dates.modified,
            type: route.type,
        }));
    }
    /** Age of the current snapshot in seconds, or null before ready(). */
    snapshotAgeSeconds() {
        if (!this.stored)
            return null;
        return Math.round((Date.now() - this.stored.fetchedAt) / 1000);
    }
}
//# sourceMappingURL=source.js.map