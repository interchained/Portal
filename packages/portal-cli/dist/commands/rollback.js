/**
 * portal rollback — revert the last applied Portal patch.
 * Restores the original file content from the patch record.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { PatchStore } from "@interchained/portal-agent";
import { banner, success, fail, warn, info, blank, header } from "../utils/print.js";
export async function rollbackCommand(opts = {}) {
    banner();
    const root = process.cwd();
    const store = new PatchStore(root);
    const all = await store.list();
    const applied = all
        .filter((p) => p.status === "applied")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (applied.length === 0) {
        info("No applied patches to roll back.");
        blank();
        return;
    }
    let targetId = opts.id;
    if (!targetId) {
        const { selected } = await prompts({
            type: "select",
            name: "selected",
            message: "Which patch do you want to roll back?",
            choices: applied.slice(0, 10).map((p) => ({
                title: `${pc.bold(p.file)}  ${pc.dim(p.reason.slice(0, 55))}  ${pc.dim(p.createdAt.slice(0, 10))}`,
                value: p.id,
            })),
        });
        targetId = selected;
    }
    if (!targetId) {
        blank();
        return;
    }
    const patch = applied.find((p) => p.id === targetId);
    if (!patch) {
        fail(`Patch ${targetId} not found.`);
        process.exit(1);
    }
    header(`Rolling back: ${patch.file}`);
    console.log(pc.dim(`  Reason: ${patch.reason}`));
    blank();
    if (!patch.original) {
        warn("This patch has no original content recorded — it created a new file.");
        const { confirm } = await prompts({
            type: "confirm",
            name: "confirm",
            message: `Delete ${patch.file}?`,
            initial: false,
        });
        if (!confirm) {
            info("Cancelled.");
            blank();
            return;
        }
        const { unlink } = await import("node:fs/promises");
        await unlink(join(root, patch.file)).catch(() => { });
        await store.update(patch.id, { status: "rejected" });
        success(`Deleted: ${patch.file}`);
        blank();
        return;
    }
    const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Restore ${pc.bold(patch.file)} to its pre-patch state?`,
        initial: true,
    });
    if (!confirm) {
        info("Cancelled.");
        blank();
        return;
    }
    const filePath = join(root, patch.file);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, patch.original, "utf-8");
    await store.update(patch.id, { status: "pending" });
    success(`Rolled back: ${patch.file}`);
    info(`Patch ${patch.id.slice(0, 8)} moved back to "pending" status.`);
    blank();
}
//# sourceMappingURL=rollback.js.map