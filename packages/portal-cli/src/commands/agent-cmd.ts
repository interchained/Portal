/**
 * portal agent list  — list configured agents and their permissions
 * portal agent run   — run a specific agent task manually
 *
 * Agents are real defineAgent({ ... }) definitions loaded from agents/*.agent.ts.
 * Their declared permissions are enforced:
 *   - canPatch: false        → read-only; the agent reviews and reports, never writes
 *   - canPatch: true         → may produce patches
 *   - requiresApproval: true → patches stay pending for `portal patch`
 *   - requiresApproval: false→ clean patches are applied automatically
 * When requiresApproval is unset, it falls back to the contract's publishing policy.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import ora from "ora";
import {
  Runner,
  Sentinel,
  PatchStore,
  createPatch,
  applyPatch,
} from "@interchained/portal-agent";
import type { AgentDefinition } from "@interchained/portal-contract";
import { banner, header, success, fail, info, step, blank } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";
import { findAgentFiles, matchAgentFile, loadAgent } from "../utils/agents.js";

// ── helpers ─────────────────────────────────────────────────────────────────

function permsLabel(def: AgentDefinition): string {
  const canPatch = def.canPatch === true;
  const requiresApproval = def.requiresApproval !== false; // default to safe
  const parts = [
    canPatch ? pc.yellow("can patch") : pc.dim("read-only"),
    canPatch
      ? requiresApproval
        ? pc.cyan("requires approval")
        : pc.dim("auto-apply")
      : null,
    def.model ? pc.dim(`model: ${def.model}`) : null,
  ].filter(Boolean);
  return parts.join("  ");
}

// ── portal agent list ─────────────────────────────────────────────────────────

export async function agentListCommand(): Promise<void> {
  banner();

  const root      = process.cwd();
  const agentsDir = join(root, "agents");
  const files     = await findAgentFiles(agentsDir);

  if (files.length === 0) {
    info("No agents configured.");
    info("Create agents/seo.agent.ts with defineAgent({ ... }) to get started.");
    blank();
    return;
  }

  header("Configured Agents");
  blank();

  for (const file of files) {
    const def = await loadAgent(join(agentsDir, file));
    console.log(`${pc.bold(pc.cyan(def.name))}  ${pc.dim("·")}  ${pc.dim(file)}`);
    console.log(`  ${def.task || pc.dim("No task description")}`);
    console.log(`  ${permsLabel(def)}`);
    blank();
  }
}

// ── portal agent run ──────────────────────────────────────────────────────────

export async function agentRunCommand(name: string): Promise<void> {
  banner();

  const root      = process.cwd();
  const agentsDir = join(root, "agents");
  const contract  = await loadContract(root);

  const files = await findAgentFiles(agentsDir);
  if (files.length === 0) {
    fail("No agents configured. Create agents/<name>.agent.ts first.");
    process.exit(1);
  }

  const agentFile = matchAgentFile(files, name);
  if (!agentFile) {
    fail(`Agent not found: "${name}"`);
    info("Run portal agent list to see available agents.");
    process.exit(1);
  }

  const def      = await loadAgent(join(agentsDir, agentFile));
  const canPatch = def.canPatch === true;
  const requiresApproval =
    def.requiresApproval ?? (contract.policies?.publishing === "human_review");
  const task = def.task || def.name;

  const mode = !canPatch
    ? "read-only (review & report)"
    : requiresApproval
      ? "propose patches (requires approval)"
      : "auto-apply clean patches";

  header(`Running agent: ${pc.bold(def.name)}`);
  console.log(pc.dim(`  Task: ${task}`));
  console.log(pc.dim(`  App:  ${contract.name}`));
  console.log(pc.dim(`  Mode: ${mode}`));
  blank();

  let runner: Runner;
  try {
    runner = new Runner(def.model ? { model: def.model } : {});
  } catch {
    fail("AIASSIST_API_KEY not set.");
    process.exit(1);
  }

  const sentinel = new Sentinel(def.sentinel ? { model: def.sentinel } : {});
  const store    = new PatchStore(root);

  // Gather route files to run the task against.
  const routesDir = join(root, "routes");
  let routeFiles: string[] = [];
  try {
    const entries = (await readdir(routesDir, { recursive: true })) as string[];
    routeFiles = entries
      .filter((f) => f.endsWith(".page.tsx") || f.endsWith(".page.jsx"))
      .map((f) => join(routesDir, f));
  } catch {
    fail("No routes/ directory found.");
    process.exit(1);
  }

  if (routeFiles.length === 0) {
    info("No route files found under routes/.");
    blank();
    return;
  }

  const contractSummary = `App: ${contract.name}\nGoals: ${contract.goals.join("; ")}`;
  let proposed = 0;
  let applied  = 0;
  let reviewed = 0;

  for (const filePath of routeFiles) {
    const content = await readFile(filePath, "utf-8");
    const rel = filePath.replace(root + "/", "");

    const spinner = ora(`  Processing ${rel}…`).start();
    try {
      const next = await runner.generatePatch({
        filePath: rel,
        originalContent: content,
        finding: task,
        contract: contractSummary,
      });
      spinner.stop();

      // No meaningful change → nothing to do.
      if (next.trim() === content.trim()) continue;

      const review = await sentinel.review({
        contract,
        filePath: rel,
        original: content,
        proposed: next,
        agentTask: task,
      });

      // Read-only agent: report findings, never write a patch.
      if (!canPatch) {
        reviewed++;
        const headline = review.approved ? pc.green("ok") : pc.yellow("attention");
        step(`${rel}  ${pc.dim("·")}  ${headline}  ${review.summary}`);
        for (const v of review.violations) console.log(pc.dim(`      • ${v}`));
        continue;
      }

      const patch = createPatch({
        agent: def.name,
        file: rel,
        original: content,
        proposed: next,
        reason: task,
        requiresApproval,
        sentinelApproved: review.approved,
        sentinelSummary: review.summary,
        sentinelViolations: review.violations,
      });
      await store.save(patch);
      proposed++;

      // Auto-apply only when the agent permits it and the review is clean.
      if (!requiresApproval && review.approved) {
        await store.update(patch.id, { status: "approved" });
        await applyPatch({ ...patch, status: "approved" }, root, store);
        applied++;
        step(`${rel}  ${pc.dim("·")}  ${pc.green("applied")}  ${review.summary}`);
      } else {
        step(`${rel}  ${pc.dim("·")}  ${pc.cyan("patch saved")}  run portal patch to review`);
      }
    } catch {
      spinner.stop();
    }
  }

  blank();
  if (!canPatch) {
    info(`Read-only run complete — ${reviewed} file${reviewed !== 1 ? "s" : ""} reviewed, nothing written.`);
  } else if (proposed === 0) {
    info("No changes proposed.");
  } else if (applied > 0) {
    success(`${applied} applied, ${proposed - applied} pending — run portal patch to review the rest.`);
  } else {
    success(`${proposed} patch${proposed !== 1 ? "es" : ""} queued — run portal patch to review and apply.`);
  }
  blank();
}
