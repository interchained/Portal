/**
 * NedbSnapshotStore — last-good snapshots persisted in NEDB.
 *
 * OUR database is NEDB. Client WordPress sites run whatever they run
 * (MySQL, MariaDB, SQLite — their territory, reached only through WP APIs);
 * on the Portal side of the tunnel, snapshot persistence goes to a nedbd
 * daemon wherever one is reachable, and the file store is only the
 * zero-dependency fallback.
 *
 * What NEDB buys over a file (and why this is the on-ramp to the snapshot
 * ledger):
 *   - every save is an append to a BLAKE2b hash-chained log — snapshots are
 *     tamper-evident, and GET /verify proves the history untouched
 *   - every save cites the db head it extends via caused_by — causal
 *     provenance, TRACE-able once engines ship the hash-trace fix
 *   - AS OF seq time-travel replays any historical snapshot for free
 *
 * Wire API (verified live against nedbd 2.6.1):
 *   GET  /health
 *   GET  /v1/databases                       → { databases: [{name, ...}] }
 *   POST /v1/databases        {name}
 *   POST /v1/databases/:db/put {coll,id,doc,caused_by?} → {ok, seq, head}
 *   POST /v1/databases/:db/query {nql}      → {rows, count, seq, head}
 *   GET  /v1/databases/:db/verify           → {ok, seq, head}
 *
 * Auth: optional `Authorization: Bearer <NEDBD_TOKEN>`.
 */
import type { SnapshotStore, StoredSnapshot } from "./types.js";
export interface NedbSnapshotStoreOptions {
    /** nedbd base URL, e.g. http://127.0.0.1:7070 */
    url: string;
    /** Database name (default "portal_bridge"). */
    db?: string;
    /** Collection name (default "bridge_snapshots"). */
    collection?: string;
    /** Bearer token when nedbd runs with NEDBD_TOKEN. */
    token?: string;
    /**
     * Identifies WHICH WordPress site this snapshot belongs to, so one nedbd
     * can back many bridges. Defaults to a fingerprint the caller derives from
     * PORTAL_BRIDGE_BASE_URL.
     */
    siteKey: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class NedbSnapshotStore implements SnapshotStore {
    private readonly options;
    private readonly base;
    private readonly db;
    private readonly collection;
    private readonly docId;
    private ensured;
    constructor(options: NedbSnapshotStoreOptions);
    load(): Promise<StoredSnapshot | null>;
    save(stored: StoredSnapshot): Promise<void>;
    private ensureDatabase;
    private request;
}
/** Stable site key from a bridge base URL: host, dots → dashes. */
export declare function siteKeyFromBaseUrl(baseUrl: string): string;
//# sourceMappingURL=nedb-store.d.ts.map