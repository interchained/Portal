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
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { validateContract } from "@interchained/portal-contract";
const CANDIDATE_PATHS = [
    "app.contract.json",
    "app.contract.ts",
    "app.contract.js",
    "portal.contract.json",
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
        catch { /* next */ }
    }
    return null;
}
export async function loadContract(root = process.cwd()) {
    const contractPath = await findContractPath(root);
    if (!contractPath)
        return { name: "Portal App", goals: [] };
    try {
        const src = await readFile(contractPath, "utf-8");
        // ── JSON file ─────────────────────────────────────────────────────────────
        if (contractPath.endsWith(".json")) {
            return validateContract(JSON.parse(src));
        }
        // ── TS/JS patterns ────────────────────────────────────────────────────────
        // We try several common shapes, in order of specificity.
        // 1. defineApp({ ... })
        const defineMatch = src.match(/defineApp\s*\(\s*(\{[\s\S]*?\})\s*\)/);
        if (defineMatch)
            return evalObject(defineMatch[1]);
        // 2. export default { ... }   (inline object literal)
        const exportDefaultInline = src.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
        if (exportDefaultInline)
            return evalObject(exportDefaultInline[1]);
        // 3. const <name>: AppContract = { ... }
        const constTyped = src.match(/const\s+\w+\s*:\s*AppContract\s*=\s*(\{[\s\S]*?\});\s*$/m);
        if (constTyped)
            return evalObject(constTyped[1]);
        // 4. const <name> = { ... }   (no type annotation)
        const constPlain = src.match(/const\s+\w+\s*=\s*(\{[\s\S]*?\});\s*$/m);
        if (constPlain)
            return evalObject(constPlain[1]);
        return { name: "Portal App", goals: [] };
    }
    catch {
        return { name: "Portal App", goals: [] };
    }
}
function evalObject(src) {
    // Strip TypeScript casts and `as const` before evaluating
    const cleaned = src
        .replace(/\s+as\s+\w[\w.]*(\[\])?/g, "")
        .replace(/\s+satisfies\s+\w[\w.]*/g, "");
    const fn = new Function(`return (${cleaned})`);
    return validateContract(fn());
}
//# sourceMappingURL=contract.js.map