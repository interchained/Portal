/**
 * Portal Audit Engine — v1.1
 *
 * Runs structured checks across all route files against the app contract.
 * Quality gates in the contract promote specific warns to hard fails.
 *
 * Categories: seo · cta · links · brand · accessibility · quality
 */
import type { AppContract } from "@interchained/portal-contract";
import { Runner } from "./runner.js";
export type CheckCategory = "seo" | "cta" | "links" | "brand" | "accessibility" | "quality";
export type CheckStatus = "pass" | "warn" | "fail";
export interface AuditFinding {
    category: CheckCategory;
    status: CheckStatus;
    file: string;
    message: string;
    suggestion?: string;
    line?: number;
}
export interface AuditReport {
    timestamp: string;
    appName: string;
    routesDir: string;
    findings: AuditFinding[];
    summary: {
        pass: number;
        warn: number;
        fail: number;
        total: number;
    };
}
export declare function runAudit(contract: AppContract, routesDir: string, options?: {
    ai?: boolean;
    runner?: Runner;
}): Promise<AuditReport>;
//# sourceMappingURL=audit.d.ts.map