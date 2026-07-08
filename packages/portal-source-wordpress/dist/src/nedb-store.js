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
import { createHash } from "node:crypto";
export class NedbSnapshotStore {
    options;
    base;
    db;
    collection;
    docId;
    ensured = false;
    constructor(options) {
        this.options = options;
        this.base = options.url.replace(/\/+$/, "");
        this.db = options.db ?? "portal_bridge";
        this.collection = options.collection ?? "bridge_snapshots";
        this.docId = `bridge_current_${options.siteKey}`;
    }
    async load() {
        try {
            const result = await this.request("POST", `/v1/databases/${this.db}/query`, { nql: `FROM ${this.collection} WHERE _id = "${this.docId}" LIMIT 1` });
            const row = result.rows?.[0];
            if (!row || typeof row["payload"] !== "string")
                return null;
            const snapshot = JSON.parse(row["payload"]);
            const fetchedAt = typeof row["fetchedAt"] === "number" ? row["fetchedAt"] : 0;
            return { snapshot, fetchedAt };
        }
        catch {
            return null; // Unreachable nedbd at load time = no last-good snapshot.
        }
    }
    async save(stored) {
        await this.ensureDatabase();
        // Causal parent: the exact chain head this save extends. Verified route;
        // best-effort — a fresh db has the genesis head and that is fine too.
        let causedBy;
        try {
            const verify = await this.request("GET", `/v1/databases/${this.db}/verify`);
            if (verify.head && !/^0+$/.test(verify.head))
                causedBy = [verify.head];
        }
        catch {
            causedBy = undefined;
        }
        const payload = JSON.stringify(stored.snapshot);
        const body = {
            coll: this.collection,
            id: this.docId,
            doc: {
                payload,
                payloadSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
                fetchedAt: stored.fetchedAt,
                snapshotId: stored.snapshot.snapshotId,
                contentHash: stored.snapshot.contentHash,
                routeCount: stored.snapshot.routeCount,
                generatedAt: stored.snapshot.generatedAt,
                savedAt: Date.now(),
            },
        };
        if (causedBy)
            body["caused_by"] = causedBy;
        const result = await this.request("POST", `/v1/databases/${this.db}/put`, body);
        // Verify-after-write (the Porter contract): read it back or fail loudly.
        const readBack = await this.request("POST", `/v1/databases/${this.db}/query`, { nql: `FROM ${this.collection} WHERE _id = "${this.docId}" LIMIT 1` });
        const row = readBack.rows?.[0];
        if (!row || row["contentHash"] !== stored.snapshot.contentHash) {
            throw new Error(`NedbSnapshotStore: write not verified for ${this.docId} (seq ${result.seq})`);
        }
    }
    async ensureDatabase() {
        if (this.ensured)
            return;
        const list = await this.request("GET", "/v1/databases");
        const names = (list.databases ?? []).map((d) => d?.name).filter(Boolean);
        if (!names.includes(this.db)) {
            await this.request("POST", "/v1/databases", { name: this.db });
        }
        this.ensured = true;
    }
    async request(method, path, body) {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 10000);
        try {
            const headers = { "Content-Type": "application/json" };
            if (this.options.token)
                headers["Authorization"] = `Bearer ${this.options.token}`;
            const response = await fetchImpl(this.base + path, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
            });
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`nedbd ${method} ${path}: HTTP ${response.status}: ${text.slice(0, 200)}`);
            }
            return JSON.parse(text);
        }
        finally {
            clearTimeout(timer);
        }
    }
}
/** Stable site key from a bridge base URL: host, dots → dashes. */
export function siteKeyFromBaseUrl(baseUrl) {
    try {
        const url = new URL(baseUrl);
        return url.host.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    }
    catch {
        return "default";
    }
}
//# sourceMappingURL=nedb-store.js.map