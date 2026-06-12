/**
 * Page / component generation.
 *
 * Flow when Sentinel is present:
 *   Runner generates → Sentinel.reviewAndApply() → applied or blocked
 *
 * Flow without Sentinel (--no-sentinel or API key absent):
 *   Runner generates → patch saved as "pending" → human approves via CLI
 */
import type { AppContract, PageContract } from "@interchained/portal-contract";
import { Runner } from "./runner.js";
import { Sentinel, type SentinelReview } from "./sentinel.js";
import { PatchStore, type Patch } from "./patch.js";
export interface GenerateOptions {
    runner: Runner;
    sentinel?: Sentinel;
    contract: AppContract;
    projectRoot: string;
    route?: string;
    /** Only consulted when NO sentinel is present */
    requiresApproval?: boolean;
}
export interface GenerateResult {
    patch: Patch;
    /** Set whenever a Sentinel ran */
    sentinelReview?: SentinelReview;
    /**
     * True when the Sentinel applied the patch (clean or self-corrected).
     * False when no sentinel ran — human approval prompt shown instead.
     */
    sentinelApplied: boolean;
    /**
     * Populated when the Sentinel had to self-correct the patch before applying.
     * Undefined when the patch was clean.
     */
    sentinelFix?: {
        summary: string;
        changes: string[];
    };
}
/**
 * Generate a new page component from a PageContract.
 */
export declare function generatePage(page: PageContract & {
    description?: string;
}, opts: GenerateOptions, store: PatchStore): Promise<GenerateResult>;
/**
 * Generate a page from a freeform description.
 * `portal generate page "Father's Day promo"` style.
 */
export declare function generateFromPrompt(prompt: string, opts: GenerateOptions, store?: PatchStore): Promise<GenerateResult>;
//# sourceMappingURL=generate.d.ts.map