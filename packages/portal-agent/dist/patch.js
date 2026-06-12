/**
 * Safe patch system — preview, approval, and application.
 *
 * Every agent-generated change is represented as a Patch.
 * Patches with requiresApproval=true are shown as diffs
 * and must be explicitly approved before being written to disk.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
// ── Patch store (file-backed, .portal/patches/) ───────────────────────────────
export class PatchStore {
    dir;
    constructor(projectRoot) {
        this.dir = join(projectRoot, ".portal", "patches");
    }
    async save(patch) {
        await mkdir(this.dir, { recursive: true });
        await writeFile(join(this.dir, `${patch.id}.json`), JSON.stringify(patch, null, 2), "utf-8");
    }
    async load(id) {
        try {
            const raw = await readFile(join(this.dir, `${id}.json`), "utf-8");
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async list() {
        const { readdir } = await import("node:fs/promises");
        try {
            const files = await readdir(this.dir);
            const patches = [];
            for (const f of files) {
                if (f.endsWith(".json")) {
                    try {
                        const raw = await readFile(join(this.dir, f), "utf-8");
                        patches.push(JSON.parse(raw));
                    }
                    catch { /* skip corrupt */ }
                }
            }
            return patches.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }
        catch {
            return [];
        }
    }
    async update(id, updates) {
        const patch = await this.load(id);
        if (!patch)
            throw new Error(`Patch ${id} not found`);
        await this.save({ ...patch, ...updates });
    }
}
// ── Patch factory ─────────────────────────────────────────────────────────────
export function createPatch(opts) {
    return {
        ...opts,
        id: randomUUID(),
        status: "pending",
        createdAt: new Date().toISOString(),
    };
}
// ── Apply ─────────────────────────────────────────────────────────────────────
export async function applyPatch(patch, projectRoot, store) {
    if (patch.status !== "approved" && patch.requiresApproval) {
        throw new Error(`Patch ${patch.id} requires approval before applying`);
    }
    const filePath = join(projectRoot, patch.file);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, patch.proposed, "utf-8");
    await store.update(patch.id, { status: "applied" });
}
// ── Inline diff (terminal-friendly) ──────────────────────────────────────────
export function inlineDiff(original, proposed) {
    const oLines = original.split("\n");
    const pLines = proposed.split("\n");
    const lines = [];
    const maxLen = Math.max(oLines.length, pLines.length);
    for (let i = 0; i < maxLen; i++) {
        const o = oLines[i];
        const p = pLines[i];
        if (o === p) {
            lines.push(`  ${o ?? ""}`);
        }
        else {
            if (o !== undefined)
                lines.push(`- ${o}`);
            if (p !== undefined)
                lines.push(`+ ${p}`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=patch.js.map