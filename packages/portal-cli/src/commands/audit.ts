/**
 * portal audit — runs all checks against the app contract and reports findings.
 *
 * Usage:
 *   portal audit
 *   portal audit --ai          (uses AiAssist for deeper analysis)
 *   portal audit --json        (JSON output)
 *   portal audit --category seo
 */

import { join } from "node:path";
import ora from "ora";
import pc from "picocolors";
import {
  runAudit,
  Runner,
  type AuditFinding,
  type CheckCategory,
} from "@interchained/portal-agent";
import { banner, header, icon, summaryLine, info, blank } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";

export interface AuditOptions {
  ai?: boolean;
  json?: boolean;
  category?: CheckCategory;
  routesDir?: string;
}

export async function auditCommand(opts: AuditOptions = {}): Promise<void> {
  if (!opts.json) banner();

  const root     = process.cwd();
  const contract = await loadContract(root);
  const routesDir = opts.routesDir ?? join(root, "routes");

  if (!opts.json) {
    info(`Auditing: ${pc.bold(contract.name)}`);
    info(`Routes:   ${routesDir}`);
    blank();
  }

  let runner: Runner | undefined;
  if (opts.ai) {
    try {
      runner = new Runner();
    } catch {
      if (!opts.json) {
        console.log(pc.yellow("⚠ AI checks disabled — set AIASSIST_API_KEY to enable"));
      }
    }
  }

  const spinner = opts.json ? null : ora("Running checks…").start();

  const report = await runAudit(contract, routesDir, {
    ai: opts.ai && !!runner,
    runner,
  });

  spinner?.stop();

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Group by category
  const categories: CheckCategory[] = ["seo", "cta", "links", "brand", "accessibility"];
  const byCategory = new Map<CheckCategory, AuditFinding[]>();
  for (const cat of categories) {
    const findings = report.findings.filter(
      (f) => f.category === cat && (!opts.category || opts.category === cat)
    );
    if (findings.length > 0) byCategory.set(cat, findings);
  }

  if (byCategory.size === 0) {
    console.log(pc.green("✓ All checks passed — no issues found."));
    return;
  }

  for (const [cat, findings] of byCategory) {
    header(cat.toUpperCase());
    for (const f of findings) {
      const statusIcon =
        f.status === "pass" ? icon.pass :
        f.status === "warn" ? icon.warn :
        icon.fail;
      console.log(`${statusIcon} ${pc.bold(f.file)}`);
      console.log(`   ${f.message}`);
      if (f.suggestion) {
        console.log(`   ${pc.dim("Fix: ")}${pc.dim(f.suggestion)}`);
      }
      blank();
    }
  }

  summaryLine(report.summary.pass, report.summary.warn, report.summary.fail);
  blank();

  if (report.summary.fail > 0) {
    console.log(pc.dim(`Run ${pc.white("portal improve")} to auto-fix these issues.`));
  }
}
