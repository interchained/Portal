/**
 * portal improve — generates AI patches for audit findings, with human approval.
 *
 * Usage:
 *   portal improve
 *   portal improve --target seo
 *   portal improve --target accessibility
 *   portal improve --auto   (apply without asking — use carefully)
 */

import { join } from "node:path";
import prompts from "prompts";
import pc from "picocolors";
import ora from "ora";
import {
  runAudit,
  Runner,
  Sentinel,
  improveFromFindings,
  applyPatch,
  inlineDiff,
  PatchStore,
  type CheckCategory,
} from "@interchained/portal-agent";
import {
  banner, header, success, fail, warn, info, blank, icon, step,
} from "../utils/print.js";
import { loadContract } from "../utils/contract.js";

export interface ImproveOptions {
  target?: CheckCategory;
  auto?: boolean;
  routesDir?: string;
  noSentinel?: boolean;
}

export async function improveCommand(opts: ImproveOptions = {}): Promise<void> {
  banner();

  const root      = process.cwd();
  const contract  = await loadContract(root);
  const routesDir = opts.routesDir ?? join(root, "routes");
  const store     = new PatchStore(root);

  info(`Improving: ${pc.bold(contract.name)}`);
  blank();

  // 1. Run audit to get findings
  const auditSpinner = ora("Running audit…").start();
  const report = await runAudit(contract, routesDir, { ai: false });
  auditSpinner.stop();

  const actionable = report.findings.filter((f) => {
    if (f.status === "pass") return false;
    if (opts.target && f.category !== opts.target) return false;
    return true;
  });

  if (actionable.length === 0) {
    success("Nothing to improve — all checks passed!");
    return;
  }

  info(`Found ${pc.bold(String(actionable.length))} issues to address.`);
  blank();

  // 2. Create AI clients
  let runner: Runner;
  try {
    runner = new Runner();
  } catch {
    fail("AIASSIST_API_KEY not set — cannot generate improvements.");
    info("Set AIASSIST_API_KEY or VITE_AIAS_API_KEY to enable AI improvements.");
    process.exit(1);
  }

  const sentinel = opts.noSentinel ? undefined : new Sentinel();

  // 3. Generate patches
  const genSpinner = ora(`Generating patches for ${actionable.length} issues…`).start();
  const results = await improveFromFindings(actionable, {
    runner,
    sentinel,
    contract,
    projectRoot: root,
    target: opts.target ? [opts.target] : undefined,
    requiresApproval: !opts.auto,
  });
  genSpinner.stop();

  // 4. Review and apply
  let applied = 0;
  let rejected = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.skipped || !result.patch) {
      warn(`Skipped: ${result.finding.file} — ${result.skipped ?? "no patch"}`);
      skipped++;
      continue;
    }

    const { patch, sentinelReview } = result;

    // Save the patch to .portal/patches/
    await store.save(patch);

    header(`[${result.finding.category.toUpperCase()}] ${result.finding.file}`);
    console.log(`  ${pc.dim(result.finding.message)}`);
    blank();

    // Show sentinel review
    if (sentinelReview) {
      const sentinelIcon = sentinelReview.approved ? icon.pass : icon.warn;
      console.log(`${sentinelIcon} Sentinel: ${sentinelReview.summary}`);
      if (sentinelReview.violations.length > 0) {
        for (const v of sentinelReview.violations) {
          console.log(`   ${icon.fail} ${pc.red(v)}`);
        }
      }
      blank();
    }

    // Show diff
    console.log(pc.dim("─── diff ───────────────────────────────────────────"));
    const diff = inlineDiff(patch.original, patch.proposed);
    const diffLines = diff.split("\n").slice(0, 30);
    for (const line of diffLines) {
      if (line.startsWith("+ ")) console.log(pc.green(line));
      else if (line.startsWith("- ")) console.log(pc.red(line));
      else console.log(pc.dim(line));
    }
    if (diff.split("\n").length > 30) console.log(pc.dim("  … (truncated)"));
    console.log(pc.dim("────────────────────────────────────────────────────"));
    blank();

    // Block if sentinel found violations
    if (sentinelReview && !sentinelReview.approved && !opts.auto) {
      warn("Sentinel rejected this patch — skipping.");
      await store.update(patch.id, { status: "rejected" });
      rejected++;
      continue;
    }

    if (opts.auto) {
      await applyPatch({ ...patch, status: "approved" }, root, store);
      success(`Applied: ${patch.file}`);
      applied++;
      continue;
    }

    const { choice } = await prompts({
      type: "select",
      name: "choice",
      message: `Apply this patch to ${pc.bold(patch.file)}?`,
      choices: [
        { title: pc.green("✓ Apply"),  value: "apply" },
        { title: pc.yellow("~ Skip"),  value: "skip" },
        { title: pc.red("✗ Reject"), value: "reject" },
      ],
    });

    if (choice === "apply") {
      await store.update(patch.id, { status: "approved" });
      await applyPatch({ ...patch, status: "approved" }, root, store);
      success(`Applied: ${patch.file}`);
      applied++;
    } else if (choice === "reject") {
      await store.update(patch.id, { status: "rejected" });
      warn(`Rejected: ${patch.file}`);
      rejected++;
    } else {
      info(`Skipped: ${patch.file} (patch saved to .portal/patches/${patch.id}.json)`);
      skipped++;
    }

    blank();
  }

  // Summary
  header("Done");
  if (applied > 0)  success(`${applied} patch${applied !== 1 ? "es" : ""} applied`);
  if (rejected > 0) fail(`${rejected} patch${rejected !== 1 ? "es" : ""} rejected`);
  if (skipped > 0)  info(`${skipped} skipped`);
  blank();
}
