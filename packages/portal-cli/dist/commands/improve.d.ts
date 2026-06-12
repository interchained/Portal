/**
 * portal improve — generates AI patches for audit findings, with human approval.
 *
 * Usage:
 *   portal improve
 *   portal improve --target seo
 *   portal improve --target accessibility
 *   portal improve --auto   (apply without asking — use carefully)
 */
import { type CheckCategory } from "@interchained/portal-agent";
export interface ImproveOptions {
    target?: CheckCategory;
    auto?: boolean;
    routesDir?: string;
    noSentinel?: boolean;
}
export declare function improveCommand(opts?: ImproveOptions): Promise<void>;
//# sourceMappingURL=improve.d.ts.map