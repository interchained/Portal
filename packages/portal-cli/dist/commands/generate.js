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
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import prompts from "prompts";
import pc from "picocolors";
import ora from "ora";
import { Runner, Sentinel, generateFromPrompt, applyPatch, PatchStore, } from "@interchained/portal-agent";
import { banner, header, success, fail, info, blank, icon } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";
// ── API route template ────────────────────────────────────────────────────────
function apiRouteTemplate(name) {
    const fnName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `import type { Request, Response } from "express";

/**
 * API route: /api/${name}
 * TODO: Implement this route handler.
 */
export async function ${fnName}Handler(req: Request, res: Response): Promise<void> {
  try {
    const data = {};
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}
`;
}
// ── Main generate command ─────────────────────────────────────────────────────
export async function generateCommand(sub, description, opts = {}) {
    banner();
    const root = process.cwd();
    const contract = await loadContract(root);
    const store = new PatchStore(root);
    info(`Generating ${sub}: ${pc.bold(pc.white(description))}`);
    info(`App: ${pc.bold(contract.name)}`);
    blank();
    // ── API route (no AI needed for scaffold) ────────────────────────────────
    if (sub === "api") {
        const slug = description.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const apiDir = join(root, "api");
        const outPath = join(apiDir, `${slug}.ts`);
        await mkdir(apiDir, { recursive: true });
        const source = apiRouteTemplate(slug);
        console.log(pc.dim("─── preview ─────────────────────────────────────────"));
        source.split("\n").forEach((l) => console.log(pc.dim("  ") + l));
        console.log(pc.dim("─────────────────────────────────────────────────────"));
        blank();
        if (!opts.auto) {
            const { choice } = await prompts({
                type: "select",
                name: "choice",
                message: `Write to api/${slug}.ts?`,
                choices: [
                    { title: pc.green("✓ Yes"), value: "yes" },
                    { title: pc.red("✗ No"), value: "no" },
                ],
            });
            if (choice !== "yes") {
                info("Cancelled.");
                blank();
                return;
            }
        }
        await writeFile(outPath, source, "utf-8");
        success(`Created: api/${slug}.ts`);
        blank();
        return;
    }
    // ── Component (AI generation) ────────────────────────────────────────────
    if (sub === "component") {
        let runner;
        try {
            runner = new Runner();
        }
        catch {
            fail("AIASSIST_API_KEY not set.");
            process.exit(1);
        }
        const spinner = ora(`Generating component "${description}"…`).start();
        let source;
        try {
            source = await runner.generateComponent({
                route: `/components/${description}`,
                purpose: description,
                brandVoice: contract.brand?.voice,
                colors: contract.brand?.colors,
            });
            spinner.stop();
        }
        catch (err) {
            spinner.stop();
            fail(`Generation failed: ${err.message}`);
            process.exit(1);
        }
        const slug = description.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const pascal = slug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
        const outDir = join(root, "src", "components");
        const outFile = join(outDir, `${pascal}.tsx`);
        const relPath = `src/components/${pascal}.tsx`;
        console.log(pc.dim("─── preview ─────────────────────────────────────────"));
        source.split("\n").slice(0, 30).forEach((l) => console.log(pc.dim("  ") + l));
        if (source.split("\n").length > 30)
            console.log(pc.dim("  …"));
        console.log(pc.dim("─────────────────────────────────────────────────────"));
        blank();
        if (!opts.auto) {
            const { choice } = await prompts({
                type: "select",
                name: "choice",
                message: `Write to ${relPath}?`,
                choices: [
                    { title: pc.green("✓ Yes, write it"), value: "yes" },
                    { title: pc.red("✗ Discard"), value: "no" },
                ],
            });
            if (choice !== "yes") {
                info("Discarded.");
                blank();
                return;
            }
        }
        await mkdir(outDir, { recursive: true });
        await writeFile(outFile, source, "utf-8");
        success(`Created: ${relPath}`);
        blank();
        return;
    }
    // ── Page / landing ────────────────────────────────────────────────────────
    let runner;
    try {
        runner = new Runner();
    }
    catch {
        fail("AIASSIST_API_KEY not set — cannot generate pages.");
        process.exit(1);
    }
    const useSentinel = !opts.noSentinel;
    const sentinel = useSentinel ? new Sentinel() : undefined;
    const spinMsg = sentinel
        ? `Runner generating… then Sentinel will review + apply`
        : `Generating "${description}"…`;
    const spinner = ora(spinMsg).start();
    let result;
    try {
        result = await generateFromPrompt(description, {
            runner,
            sentinel,
            contract,
            projectRoot: root,
            route: opts.route,
            requiresApproval: !opts.auto,
        }, store);
        spinner.stop();
    }
    catch (err) {
        spinner.stop();
        fail(`Generation failed: ${err.message}`);
        process.exit(1);
    }
    const { patch, sentinelReview, sentinelApplied } = result;
    // ── Sentinel always applies (clean or self-corrected) ─────────────────────
    if (sentinelApplied) {
        const { sentinelFix } = result;
        if (sentinelFix) {
            header(`${icon.pass} Sentinel applied (auto-corrected): ${patch.file}`);
            info(sentinelFix.summary);
            blank();
            sentinelFix.changes.forEach((c) => console.log(`   ${icon.pass} ${pc.cyan(c)}`));
        }
        else {
            header(`${icon.pass} Sentinel applied (clean): ${patch.file}`);
            if (sentinelReview)
                info(sentinelReview.summary);
        }
        blank();
        info(`Run portal dev to see the new page.`);
        blank();
        return;
    }
    // ── No sentinel — human decides ───────────────────────────────────────────
    header(`Generated: ${patch.file}`);
    blank();
    console.log(pc.dim("─── preview ─────────────────────────────────────────"));
    patch.proposed.split("\n").slice(0, 40).forEach((l) => console.log(pc.dim("  ") + l));
    if (patch.proposed.split("\n").length > 40)
        console.log(pc.dim("  …"));
    console.log(pc.dim("─────────────────────────────────────────────────────"));
    blank();
    if (opts.auto) {
        await store.update(patch.id, { status: "approved" });
        await applyPatch({ ...patch, status: "approved" }, root, store);
        success(`Created: ${pc.bold(patch.file)}`);
        info(`Run portal dev to see the new page.`);
        blank();
        return;
    }
    const { choice } = await prompts({
        type: "select",
        name: "choice",
        message: `Write to ${pc.bold(patch.file)}?`,
        choices: [
            { title: pc.green("✓ Yes, write it"), value: "apply" },
            { title: pc.yellow("~ Save for later"), value: "save" },
            { title: pc.red("✗ Discard"), value: "discard" },
        ],
    });
    if (choice === "apply") {
        await store.update(patch.id, { status: "approved" });
        await applyPatch({ ...patch, status: "approved" }, root, store);
        success(`Created: ${pc.bold(patch.file)}`);
        info(`Run portal dev to see it.`);
    }
    else if (choice === "save") {
        info(`Patch saved — run portal patch to apply later.`);
    }
    else {
        await store.update(patch.id, { status: "rejected" });
        info("Discarded.");
    }
    blank();
}
//# sourceMappingURL=generate.js.map