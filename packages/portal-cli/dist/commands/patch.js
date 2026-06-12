/**
 * portal patch — review and apply a pending agent-generated patch.
 */
import pc from "picocolors";
import prompts from "prompts";
import { PatchStore, applyPatch, inlineDiff } from "@interchained/portal-agent";
import { banner, header, success, warn, info, blank, icon } from "../utils/print.js";
export async function patchCommand() {
    banner();
    const root = process.cwd();
    const store = new PatchStore(root);
    const all = await store.list();
    const pending = all.filter((p) => p.status === "pending");
    if (pending.length === 0) {
        info("No pending patches.");
        console.log(pc.dim("  Patches are created by portal generate and portal improve."));
        blank();
        return;
    }
    const { selected } = await prompts({
        type: "select",
        name: "selected",
        message: `${pending.length} pending patch${pending.length !== 1 ? "es" : ""} — choose one to review:`,
        choices: pending.map((p) => ({
            title: `${pc.bold(p.file)}  ${pc.dim(p.reason.slice(0, 60))}`,
            value: p.id,
        })),
    });
    if (!selected) {
        blank();
        return;
    }
    const patch = pending.find((p) => p.id === selected);
    header(`Patch: ${patch.file}`);
    console.log(pc.dim(`  Agent:  ${patch.agent}`));
    console.log(pc.dim(`  Reason: ${patch.reason}`));
    if (patch.sentinelSummary) {
        const si = patch.sentinelApproved ? icon.pass : icon.warn;
        console.log(`  ${si} Sentinel: ${patch.sentinelSummary}`);
    }
    blank();
    console.log(pc.dim("─── diff ─────────────────────────────────────────────"));
    const diffLines = inlineDiff(patch.original, patch.proposed).split("\n").slice(0, 50);
    for (const line of diffLines) {
        if (line.startsWith("+ "))
            console.log(pc.green(line));
        else if (line.startsWith("- "))
            console.log(pc.red(line));
        else
            console.log(pc.dim(line));
    }
    console.log(pc.dim("──────────────────────────────────────────────────────"));
    blank();
    const { choice } = await prompts({
        type: "select",
        name: "choice",
        message: `Apply patch to ${pc.bold(patch.file)}?`,
        choices: [
            { title: pc.green("✓ Apply"), value: "apply" },
            { title: pc.yellow("~ Skip"), value: "skip" },
            { title: pc.red("✗ Reject"), value: "reject" },
        ],
    });
    if (choice === "apply") {
        await store.update(patch.id, { status: "approved" });
        await applyPatch({ ...patch, status: "approved" }, root, store);
        success(`Applied: ${patch.file}`);
    }
    else if (choice === "reject") {
        await store.update(patch.id, { status: "rejected" });
        warn(`Rejected and removed from queue.`);
    }
    else {
        info("Skipped.");
    }
    blank();
}
//# sourceMappingURL=patch.js.map