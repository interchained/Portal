/**
 * Improvement engine.
 *
 * Takes audit findings and generates targeted patches to fix them.
 * Each patch is passed through the Sentinel, then queued for approval.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppContract } from "@interchained/portal-contract";
import { Runner } from "./runner.js";
import { Sentinel } from "./sentinel.js";
import { createPatch, type Patch } from "./patch.js";
import type { AuditFinding, CheckCategory } from "./audit.js";

export interface ImproveOptions {
  runner: Runner;
  sentinel?: Sentinel;
  contract: AppContract;
  projectRoot: string;
  /** Filter to specific check categories */
  target?: CheckCategory[];
  requiresApproval?: boolean;
}

export interface ImproveResult {
  finding: AuditFinding;
  patch: Patch | null;
  skipped?: string;
  sentinelReview?: {
    approved: boolean;
    summary: string;
    violations: string[];
  };
}

/**
 * Generate improvement patches for a list of audit findings.
 * Returns one result per finding — some may be skipped if they need
 * manual intervention.
 */
export async function improveFromFindings(
  findings: AuditFinding[],
  opts: ImproveOptions
): Promise<ImproveResult[]> {
  const { runner, sentinel, contract, projectRoot } = opts;

  const targets = findings.filter((f) => {
    if (f.status === "pass") return false;
    if (opts.target && !opts.target.includes(f.category)) return false;
    return true;
  });

  const requiresApproval =
    opts.requiresApproval ??
    contract.policies?.publishing === "human_review";

  const results: ImproveResult[] = [];

  for (const finding of targets) {
    let original: string;
    try {
      original = await readFile(join(projectRoot, finding.file), "utf-8");
    } catch {
      results.push({ finding, patch: null, skipped: "File not found" });
      continue;
    }

    const contractSummary = `Name: ${contract.name}\nGoals: ${contract.goals.join("\n")}\nPolicies: ${JSON.stringify(contract.policies ?? {})}`;

    let proposed: string;
    try {
      proposed = await runner.generatePatch({
        filePath: finding.file,
        originalContent: original,
        finding: `[${finding.category.toUpperCase()}] ${finding.message}${finding.suggestion ? ` — Suggested fix: ${finding.suggestion}` : ""}`,
        contract: contractSummary,
      });
    } catch {
      results.push({ finding, patch: null, skipped: "Runner failed to generate patch" });
      continue;
    }

    let sentinelResult: ImproveResult["sentinelReview"];
    if (sentinel) {
      try {
        const review = await sentinel.review({
          contract,
          filePath: finding.file,
          original,
          proposed,
          agentTask: `Fix ${finding.category} issue: ${finding.message}`,
        });
        sentinelResult = {
          approved: review.approved,
          summary: review.summary,
          violations: review.violations,
        };
      } catch {
        // Sentinel failure doesn't block — patch is just flagged
      }
    }

    const patch = createPatch({
      agent: "portal-improve",
      file: finding.file,
      original,
      proposed,
      reason: `Fix [${finding.category}]: ${finding.message}`,
      requiresApproval,
      sentinelApproved: sentinelResult?.approved,
      sentinelSummary: sentinelResult?.summary,
      sentinelViolations: sentinelResult?.violations,
    });

    results.push({ finding, patch, sentinelReview: sentinelResult });
  }

  return results;
}
