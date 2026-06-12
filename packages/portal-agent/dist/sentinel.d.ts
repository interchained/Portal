/**
 * Sentinel — reviews, auto-corrects, and applies patches.
 *
 * The Sentinel never just rejects. Its contract:
 *  1. Review the Runner's output against the app contract
 *  2. If clean  → apply as-is
 *  3. If issues → self-correct (call AI to fix the violations)
 *  4. Apply the corrected version
 *  5. Report what was fixed
 *
 * The human always sees a result, never a gate.
 * The only terminal failure is an unrecoverable AI error.
 */
import { type AiAssistConfig } from "./aiassist.js";
import type { AppContract } from "@interchained/portal-contract";
import { type Patch, type PatchStore } from "./patch.js";
export interface SentinelReview {
    approved: boolean;
    summary: string;
    violations: string[];
    annotations: Array<{
        line?: number;
        type: "ok" | "warning" | "violation";
        note: string;
    }>;
}
export interface SentinelFix {
    /** Plain-English summary of what the sentinel changed */
    summary: string;
    /** Each item is one fix the sentinel applied */
    changes: string[];
    /** The corrected file content */
    correctedContent: string;
}
export interface SentinelResult {
    review: SentinelReview;
    /** Always true — sentinel either applied clean or applied its own fix */
    applied: true;
    /**
     * Populated when the sentinel had to self-correct.
     * Undefined when the patch was clean and applied as-is.
     */
    fix?: SentinelFix;
}
export declare class Sentinel {
    private client;
    constructor(config?: Partial<AiAssistConfig>);
    review(opts: {
        contract: AppContract;
        filePath: string;
        original: string;
        proposed: string;
        agentTask: string;
    }): Promise<SentinelReview>;
    fix(opts: {
        contract: AppContract;
        filePath: string;
        original: string;
        proposed: string;
        violations: string[];
        agentTask: string;
    }): Promise<SentinelFix>;
    /**
     * The primary entry point.
     *
     * Always applies something to disk. Never rejects to the caller.
     *  - Clean patch   → apply as-is, fix undefined
     *  - Dirty patch   → self-correct → apply corrected version, fix populated
     */
    reviewAndApply(opts: {
        patch: Patch;
        projectRoot: string;
        store: PatchStore;
        contract: AppContract;
        agentTask: string;
    }): Promise<SentinelResult>;
}
//# sourceMappingURL=sentinel.d.ts.map