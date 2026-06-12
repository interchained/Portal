/**
 * Portal Guard — prevents bad AI output from entering the codebase.
 *
 * Runs a set of deterministic safety checks BEFORE any patch is applied.
 * Unlike audit (which checks existing code), guard checks proposed patches.
 *
 * Checks:
 *  - No hallucinated phone numbers or emails (compares against data sources)
 *  - No changed brand colors without approval
 *  - No forbidden claims
 *  - No broken internal links (routes that don't exist)
 *  - No unsafe dependency additions
 */
import type { AppContract } from "@interchained/portal-contract";
import type { Patch } from "./patch.js";
export interface GuardViolation {
    rule: string;
    severity: "block" | "warn";
    message: string;
    evidence?: string;
}
export interface GuardResult {
    patchId: string;
    passed: boolean;
    violations: GuardViolation[];
}
export declare function guardPatch(patch: Patch, contract: AppContract): Promise<GuardResult>;
/** Run guard checks across all pending patches */
export declare function guardAllPending(patches: Patch[], contract: AppContract): Promise<GuardResult[]>;
//# sourceMappingURL=guard.d.ts.map