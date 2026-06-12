/**
 * Load app.contract.ts from a Portal project.
 * Uses a simple regex-based extraction since we can't dynamically import TS at runtime.
 * For full evaluation, we'd use jiti/tsx — but for MVP we parse the exported object.
 */
import { type AppContract } from "@interchained/portal-contract";
export declare function findContractPath(root: string): Promise<string | null>;
/**
 * Load a contract from a Portal project.
 * Attempts to read and evaluate the contract file.
 * Falls back to a safe empty contract if not found.
 */
export declare function loadContract(root?: string): Promise<AppContract>;
//# sourceMappingURL=contract.d.ts.map