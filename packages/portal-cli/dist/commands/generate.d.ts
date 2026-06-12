/**
 * portal generate page <description>
 * portal generate component <name>
 * portal generate api <name>
 *
 * Flow when Sentinel is active (default):
 *   Runner generates → Sentinel reviews → Sentinel applies if approved
 *   → if rejected: show violations, offer "apply anyway" or discard
 *
 * Flow with --no-sentinel:
 *   Runner generates → preview shown → human approves/saves/discards
 */
export type GenerateSubcommand = "page" | "landing" | "component" | "api";
export interface GenerateOptions {
    route?: string;
    auto?: boolean;
    noSentinel?: boolean;
}
export declare function generateCommand(sub: GenerateSubcommand, description: string, opts?: GenerateOptions): Promise<void>;
//# sourceMappingURL=generate.d.ts.map