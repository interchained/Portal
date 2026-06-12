/**
 * Load agent definitions from a Portal project's agents/ directory.
 *
 * Mirrors the contract loader's philosophy (see utils/contract.ts): we extract
 * the `defineAgent({ ... })` object literal and evaluate just that object rather
 * than executing the whole module. AgentDefinition is a flat object, so this is
 * safe and predictable.
 */
import { readFile, readdir, access } from "node:fs/promises";
import { basename, extname } from "node:path";
export async function agentsDirExists(agentsDir) {
    try {
        await access(agentsDir);
        return true;
    }
    catch {
        return false;
    }
}
/** List the *.agent.ts / *.agent.js files in agents/. */
export async function findAgentFiles(agentsDir) {
    try {
        const entries = await readdir(agentsDir);
        return entries
            .filter((f) => f.endsWith(".agent.ts") || f.endsWith(".agent.js"))
            .sort();
    }
    catch {
        return [];
    }
}
/**
 * Resolve a user-supplied name to an agent file.
 * Prefers an exact `<name>.agent.{ts,js}` match, then a substring match.
 */
export function matchAgentFile(files, name) {
    return (files.find((f) => f === `${name}.agent.ts` || f === `${name}.agent.js`) ??
        files.find((f) => f.includes(name)) ??
        null);
}
/** Load and parse a single agent definition file. */
export async function loadAgent(filePath) {
    const fallbackName = basename(filePath, extname(filePath)).replace(/\.agent$/, "");
    let src;
    try {
        src = await readFile(filePath, "utf-8");
    }
    catch {
        return { name: fallbackName, task: "" };
    }
    // Extraction patterns, most specific first.
    const objSrc = src.match(/defineAgent\s*\(\s*(\{[\s\S]*?\})\s*\)/)?.[1] ??
        src.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/)?.[1] ??
        src.match(/const\s+\w+\s*(?::\s*AgentDefinition)?\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/m)?.[1];
    if (!objSrc)
        return { name: fallbackName, task: "" };
    try {
        const def = evalAgentObject(objSrc);
        return {
            ...def,
            name: typeof def.name === "string" && def.name.trim() ? def.name : fallbackName,
            task: typeof def.task === "string" ? def.task : "",
        };
    }
    catch {
        return { name: fallbackName, task: "" };
    }
}
function evalAgentObject(src) {
    const cleaned = src
        .replace(/\s+as\s+\w[\w.]*(\[\])?/g, "")
        .replace(/\s+satisfies\s+\w[\w.]*/g, "");
    const fn = new Function(`return (${cleaned})`);
    const raw = fn();
    if (typeof raw !== "object" || raw === null) {
        throw new Error("agent file must export a defineAgent({ ... }) object");
    }
    return raw;
}
//# sourceMappingURL=agents.js.map