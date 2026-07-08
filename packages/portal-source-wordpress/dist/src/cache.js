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
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
/** Default on-disk location, relative to the app root. */
export const DEFAULT_SNAPSHOT_PATH = ".portal/bridge-snapshot.json";
export class FileSnapshotStore {
    filePath;
    constructor(filePath = DEFAULT_SNAPSHOT_PATH) {
        this.filePath = filePath;
    }
    async load() {
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || !parsed.snapshot)
                return null;
            return parsed;
        }
        catch {
            return null; // Missing or corrupt file = no last-good snapshot.
        }
    }
    async save(stored) {
        await mkdir(dirname(this.filePath), { recursive: true });
        // Atomic-ish: write sibling then rename, so a crash never truncates
        // the only good snapshot we have.
        const tmp = `${this.filePath}.tmp`;
        await writeFile(tmp, JSON.stringify(stored), "utf8");
        await rename(tmp, this.filePath);
    }
}
export class MemorySnapshotStore {
    stored = null;
    async load() {
        return this.stored;
    }
    async save(stored) {
        this.stored = stored;
    }
}
//# sourceMappingURL=cache.js.map