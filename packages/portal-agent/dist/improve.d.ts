/**
 * Improvement engine.
 *
 * Takes audit findings and generates targeted patches to fix them.
 * Each patch is passed through the Sentinel, then queued for approval.
 */
import type { AppContract } from "@interchained/portal-contract";
import { Runner } from "./runner.js";
import { Sentinel } from "./sentinel.js";
import { type Patch } from "./patch.js";
import type { AuditFinding, CheckCategory } from "./audit.js";
export interface ImproveOptions {
    runner: Runner;
    sentinel?: Sentinel;
    contract: AppContract;
    projectRoot: string;
    /** Filter to specific check categories */
    target?: CheckCategory[];
    requiresApproval?: boolean;
}
export interface ImproveResult {
    finding: AuditFinding;
    patch: Patch | null;
    skipped?: string;
    sentinelReview?: {
        approved: boolean;
        summary: string;
        violations: string[];
    };
}
/**
 * Generate improvement patches for a list of audit findings.
 * Returns one result per finding — some may be skipped if they need
 * manual intervention.
 */
export declare function improveFromFindings(findings: AuditFinding[], opts: ImproveOptions): Promise<ImproveResult[]>;
//# sourceMappingURL=improve.d.ts.map