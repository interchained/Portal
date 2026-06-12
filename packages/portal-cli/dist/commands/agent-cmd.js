/**
 * portal agent list  — list configured agents and their permissions
 * portal agent run   — run a specific agent task manually
 */
import { readFile, readdir, access } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import pc from "picocolors";
import ora from "ora";
import { Runner, Sentinel, PatchStore, createPatch } from "@interchained/portal-agent";
import { banner, header, success, fail, info, step, blank } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";
async function exists(p) {
    try {
        await access(p);
        return true;
    }
    catch {
        return false;
    }
}
// ── portal agent list ─────────────────────────────────────────────────────────
export async function agentListCommand() {
    banner();
    const root = process.cwd();
    const agentsDir = join(root, "agents");
    if (!(await exists(agentsDir))) {
        info("No agents/ directory found.");
        info("Create agents/seo.agent.ts to get started.");
        blank();
        return;
    }
    const entries = await readdir(agentsDir);
    const agentFiles = entries.filter((f) => f.endsWith(".agent.ts") || f.endsWith(".agent.js"));
    if (agentFiles.length === 0) {
        info("agents/ directory is empty — no agents configured.");
        blank();
        return;
    }
    header("Configured Agents");
    blank();
    for (const file of agentFiles) {
        const src = await readFile(join(agentsDir, file), "utf-8");
        // Extract name and task from defineAgent({ ... }) call
        const nameMatch = src.match(/name\s*:\s*["']([^"']+)["']/);
        const taskMatch = src.match(/task\s*:\s*["']([^"']+)["']/);
        const canPatch = src.includes("canPatch: true");
        const needsApproval = src.includes("requiresApproval: true");
        const name = nameMatch?.[1] ?? basename(file, extname(file));
        const task = taskMatch?.[1] ?? "No task description";
        console.log(`${pc.bold(pc.cyan(name))}  ${pc.dim("·")}  ${pc.dim(file)}`);
        console.log(`  ${task}`);
        console.log(`  ${canPatch ? pc.yellow("can patch") : pc.dim("read-only")}  ` +
            `${needsApproval ? pc.cyan("requires approval") : pc.dim("auto-apply")}`);
        blank();
    }
}
// ── portal agent run ──────────────────────────────────────────────────────────
export async function agentRunCommand(name) {
    banner();
    const root = process.cwd();
    const agentsDir = join(root, "agents");
    const contract = await loadContract(root);
    // Find the agent file
    let agentFile = null;
    try {
        const entries = await readdir(agentsDir);
        agentFile =
            entries.find((f) => f === `${name}.agent.ts` || f === `${name}.agent.js`) ?? null;
        if (!agentFile) {
            agentFile = entries.find((f) => f.includes(name)) ?? null;
        }
    }
    catch {
        fail("agents/ directory not found. Create an agent first.");
        process.exit(1);
    }
    if (!agentFile) {
        fail(`Agent not found: "${name}"`);
        info(`Run portal agent list to see available agents.`);
        process.exit(1);
    }
    const src = await readFile(join(agentsDir, agentFile), "utf-8");
    const taskMatch = src.match(/task\s*:\s*["']([^"']+)["']/);
    const canPatch = src.includes("canPatch: true");
    const task = taskMatch?.[1] ?? name;
    header(`Running agent: ${pc.bold(name)}`);
    console.log(pc.dim(`  Task: ${task}`));
    console.log(pc.dim(`  App:  ${contract.name}`));
    blank();
    let runner;
    try {
        runner = new Runner();
    }
    catch {
        fail("AIASSIST_API_KEY not set.");
        process.exit(1);
    }
    const sentinel = new Sentinel();
    const store = new PatchStore(root);
    // Run the agent task against each route file
    const routesDir = join(root, "routes");
    let routeFiles = [];
    try {
        const entries = await readdir(routesDir, { recursive: true });
        routeFiles = entries
            .filter((f) => f.endsWith(".page.tsx") || f.endsWith(".page.jsx"))
            .map((f) => join(routesDir, f));
    }
    catch {
        fail("No routes/ directory found.");
        process.exit(1);
    }
    const contractSummary = `App: ${contract.name}\nGoals: ${contract.goals.join("; ")}`;
    let patchCount = 0;
    for (const filePath of routeFiles) {
        const content = await readFile(filePath, "utf-8");
        const rel = filePath.replace(root + "/", "");
        const spinner = ora(`  Processing ${rel}…`).start();
        try {
            const proposed = await runner.generatePatch({
                filePath: rel,
                originalContent: content,
                finding: task,
                contract: contractSummary,
            });
            spinner.stop();
            const review = await sentinel.review({
                contract,
                filePath: rel,
                original: content,
                proposed,
                agentTask: task,
            });
            const patch = createPatch({
                agent: name,
                file: rel,
                original: content,
                proposed,
                reason: task,
                requiresApproval: true,
                sentinelApproved: review.approved,
                sentinelSummary: review.summary,
                sentinelViolations: review.violations,
            });
            await store.save(patch);
            patchCount++;
            step(`Patch saved for ${rel} — run portal patch to review`);
        }
        catch {
            spinner.stop();
        }
    }
    blank();
    if (patchCount > 0) {
        success(`${patchCount} patch${patchCount !== 1 ? "es" : ""} queued — run portal patch to review and apply`);
    }
    else {
        info("No patches generated.");
    }
    blank();
}
//# sourceMappingURL=agent-cmd.js.map