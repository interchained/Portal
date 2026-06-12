/**
 * Load app.contract from a Portal project.
 *
 * Supported formats (checked in order):
 *   1. app.contract.json          — plain JSON, zero parsing ambiguity
 *   2. app.contract.ts / .js      — static TS/JS, several export patterns handled
 *
 * The contract file is intentionally kept as static data (no runtime logic).
 * We extract it with a regex rather than executing arbitrary code.
 */
import { type AppContract } from "@interchained/portal-contract";
export declare function findContractPath(root: string): Promise<string | null>;
export declare function loadContract(root?: string): Promise<AppContract>;
//# sourceMappingURL=contract.d.ts.map