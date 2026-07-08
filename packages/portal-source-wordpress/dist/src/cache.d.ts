/**
 * Last-good snapshot persistence — the heart of snapshot-first mode.
 *
 * The store interface is deliberately tiny so backends are trivial to add:
 *   - FileSnapshotStore  (default): zero-dependency, works on any host
 *   - MemorySnapshotStore: tests and ephemeral runtimes
 *   - NedbSnapshotStore  (nedb-store.js): first-class where nedbd runs —
 *     snapshots become versioned, hash-chained, tamper-evident records
 *     (the on-ramp to the NEDB snapshot ledger).
 */
import type { SnapshotStore, StoredSnapshot } from "./types.js";
/** Default on-disk location, relative to the app root. */
export declare const DEFAULT_SNAPSHOT_PATH = ".portal/bridge-snapshot.json";
export declare class FileSnapshotStore implements SnapshotStore {
    private readonly filePath;
    constructor(filePath?: string);
    load(): Promise<StoredSnapshot | null>;
    save(stored: StoredSnapshot): Promise<void>;
}
export declare class MemorySnapshotStore implements SnapshotStore {
    private stored;
    load(): Promise<StoredSnapshot | null>;
    save(stored: StoredSnapshot): Promise<void>;
}
//# sourceMappingURL=cache.d.ts.map