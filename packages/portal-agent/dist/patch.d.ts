/**
 * Safe patch system — preview, approval, and application.
 *
 * Every agent-generated change is represented as a Patch.
 * Patches with requiresApproval=true are shown as diffs
 * and must be explicitly approved before being written to disk.
 */
export type PatchStatus = "pending" | "approved" | "rejected" | "applied";
export interface Patch {
    id: string;
    /** Agent that generated this patch */
    agent: string;
    /** Path relative to project root */
    file: string;
    original: string;
    proposed: string;
    /** Human-readable reason for the change */
    reason: string;
    requiresApproval: boolean;
    status: PatchStatus;
    createdAt: string;
    /** Sentinel review (if sentinel ran) */
    sentinelApproved?: boolean;
    sentinelSummary?: string;
    sentinelViolations?: string[];
}
export declare class PatchStore {
    private dir;
    constructor(projectRoot: string);
    save(patch: Patch): Promise<void>;
    load(id: string): Promise<Patch | null>;
    list(): Promise<Patch[]>;
    update(id: string, updates: Partial<Patch>): Promise<void>;
}
export declare function createPatch(opts: Omit<Patch, "id" | "createdAt" | "status">): Patch;
export declare function applyPatch(patch: Patch, projectRoot: string, store: PatchStore): Promise<void>;
export declare function inlineDiff(original: string, proposed: string): string;
//# sourceMappingURL=patch.d.ts.map