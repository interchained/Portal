/**
 * Page / component generation.
 *
 * Flow when Sentinel is present:
 *   Runner generates → Sentinel.reviewAndApply() → applied or blocked
 *
 * Flow without Sentinel (--no-sentinel or API key absent):
 *   Runner generates → patch saved as "pending" → human approves via CLI
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppContract, PageContract } from "@interchained/portal-contract";
import { Runner } from "./runner.js";
import { Sentinel, type SentinelReview } from "./sentinel.js";
import { createPatch, PatchStore, type Patch } from "./patch.js";

export interface GenerateOptions {
  runner: Runner;
  sentinel?: Sentinel;
  contract: AppContract;
  projectRoot: string;
  route?: string;
  /** Only consulted when NO sentinel is present */
  requiresApproval?: boolean;
}

export interface GenerateResult {
  patch: Patch;
  /** Set whenever a Sentinel ran */
  sentinelReview?: SentinelReview;
  /**
   * True when the Sentinel applied the patch (clean or self-corrected).
   * False when no sentinel ran — human approval prompt shown instead.
   */
  sentinelApplied: boolean;
  /**
   * Populated when the Sentinel had to self-correct the patch before applying.
   * Undefined when the patch was clean.
   */
  sentinelFix?: { summary: string; changes: string[] };
}

/**
 * Generate a new page component from a PageContract.
 */
export async function generatePage(
  page: PageContract & { description?: string },
  opts: GenerateOptions,
  store: PatchStore
): Promise<GenerateResult> {
  const { runner, sentinel, contract } = opts;

  const fileName = routeToFileName(page.route);
  const filePath = join(opts.projectRoot, "routes", fileName);
  let original = "";
  try {
    original = await readFile(filePath, "utf-8");
  } catch {
    // New file
  }

  const proposed = await runner.generateComponent({
    route: page.route,
    purpose: page.purpose,
    audience: page.audience,
    primaryAction: page.primaryAction,
    brandVoice: contract.brand?.voice,
    colors: contract.brand?.colors,
  });

  const requiresApproval =
    opts.requiresApproval ?? contract.policies?.publishing === "human_review";

  const patch = createPatch({
    agent: "portal-generate",
    file: join("routes", fileName),
    original,
    proposed,
    reason: `Generate page: ${page.purpose}`,
    requiresApproval,
  });

  await store.save(patch);

  // ── Sentinel is the gate + applier ─────────────────────────────────────────
  if (sentinel) {
    const result = await sentinel.reviewAndApply({
      patch,
      projectRoot: opts.projectRoot,
      store,
      contract,
      agentTask: `Generate page for route "${page.route}": ${page.purpose}`,
    });

    return {
      patch,
      sentinelReview: result.review,
      sentinelApplied: result.applied,
      sentinelFix: result.fix
        ? { summary: result.fix.summary, changes: result.fix.changes }
        : undefined,
    };
  }

  // ── No sentinel — patch stays "pending", human decides ────────────────────
  return { patch, sentinelApplied: false };
}

/**
 * Generate a page from a freeform description.
 * `portal generate page "Father's Day promo"` style.
 */
export async function generateFromPrompt(
  prompt: string,
  opts: GenerateOptions,
  store?: PatchStore
): Promise<GenerateResult> {
  const resolvedStore = store ?? new PatchStore(opts.projectRoot);
  const route = opts.route ?? promptToRoute(prompt);
  const page: PageContract = {
    route,
    purpose: prompt,
    audience: undefined,
    primaryAction: undefined,
  };
  return generatePage(page, opts, resolvedStore);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function routeToFileName(route: string): string {
  const clean = route.replace(/^\//, "") || "index";
  return `${clean}.page.tsx`;
}

function promptToRoute(prompt: string): string {
  return (
    "/" +
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48)
  );
}
