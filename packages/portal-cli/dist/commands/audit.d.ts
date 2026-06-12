/**
 * portal audit — runs all checks against the app contract and reports findings.
 *
 * Usage:
 *   portal audit
 *   portal audit --ai          (uses AiAssist for deeper analysis)
 *   portal audit --json        (JSON output)
 *   portal audit --category seo
 */
import { type CheckCategory } from "@interchained/portal-agent";
export interface AuditOptions {
    ai?: boolean;
    json?: boolean;
    category?: CheckCategory;
    routesDir?: string;
}
export declare function auditCommand(opts?: AuditOptions): Promise<void>;
//# sourceMappingURL=audit.d.ts.map