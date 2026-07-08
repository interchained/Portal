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
import { BridgeClient } from "./client.js";
import type { BridgeMenu, BridgeMode, BridgeRoute, BridgeSite, BridgeSitemapEntry, BridgeSnapshot, SnapshotStore } from "./types.js";
export interface WordPressBridgeSourceOptions {
    client: BridgeClient;
    store?: SnapshotStore;
    mode?: BridgeMode;
    /** Snapshot staleness TTL in seconds (default 300). */
    cacheTtl?: number;
    /** Diagnostics hook (portal serve wires its logger). */
    log?: (message: string) => void;
}
export declare class WordPressBridgeSource {
    readonly mode: BridgeMode;
    private readonly client;
    private readonly store;
    private readonly ttlMs;
    private readonly log;
    private stored;
    private routesByPath;
    private refreshing;
    constructor(options: WordPressBridgeSourceOptions);
    /**
     * Ensure a snapshot is available. Store first; tunnel when the store is
     * empty. Throws only when BOTH are unavailable — a bridge with neither a
     * last-good snapshot nor a reachable WordPress cannot serve.
     */
    ready(): Promise<void>;
    /** Fetch a fresh snapshot through the tunnel and persist it as last-good. */
    refresh(): Promise<void>;
    /** Kick a background refresh when the snapshot is past its TTL. */
    refreshIfStale(): void;
    private adopt;
    /**
     * Resolve a public path to a route. Deterministic normalization: exact
     * match, then the trailing-slash toggle. Snapshot-first answers from
     * memory; live mode asks WordPress and falls back to the snapshot.
     */
    resolve(path: string): Promise<BridgeRoute | null>;
    private lookup;
    snapshot(): BridgeSnapshot | null;
    site(): BridgeSite | null;
    menus(): BridgeMenu[];
    routes(): BridgeRoute[];
    sitemapEntries(): BridgeSitemapEntry[];
    /** Age of the current snapshot in seconds, or null before ready(). */
    snapshotAgeSeconds(): number | null;
}
//# sourceMappingURL=source.d.ts.map