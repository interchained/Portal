/**
 * Load app.contract.ts from a Portal project.
 * Uses a simple regex-based extraction since we can't dynamically import TS at runtime.
 * For full evaluation, we'd use jiti/tsx — but for MVP we parse the exported object.
 */
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { validateContract } from "@interchained/portal-contract";
const CANDIDATE_PATHS = [
    "app.contract.ts",
    "app.contract.js",
    "portal.contract.ts",
    "portal.contract.js",
];
export async function findContractPath(root) {
    for (const candidate of CANDIDATE_PATHS) {
        const full = join(root, candidate);
        try {
            await access(full);
            return full;
        }
        catch { /* continue */ }
    }
    return null;
}
/**
 * Load a contract from a Portal project.
 * Attempts to read and evaluate the contract file.
 * Falls back to a safe empty contract if not found.
 */
export async function loadContract(root = process.cwd()) {
    const contractPath = await findContractPath(root);
    if (!contractPath) {
        return { name: "Portal App", goals: [] };
    }
    try {
        const src = await readFile(contractPath, "utf-8");
        // Extract the object passed to defineApp() using a simple heuristic.
        // This is intentionally dumb — the contract file should be static data, not logic.
        const match = src.match(/defineApp\(\s*(\{[\s\S]*?\})\s*\)/);
        if (!match) {
            return { name: "Portal App", goals: [] };
        }
        // Safe eval via Function constructor (no side effects in contract files)
        const fn = new Function(`return (${match[1]})`);
        const raw = fn();
        return validateContract(raw);
    }
    catch {
        return { name: "Portal App", goals: [] };
    }
}
//# sourceMappingURL=contract.js.map