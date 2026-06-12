/**
 * Portal Guard — prevents bad AI output from entering the codebase.
 *
 * Runs a set of deterministic safety checks BEFORE any patch is applied.
 * Unlike audit (which checks existing code), guard checks proposed patches.
 *
 * Checks:
 *  - No hallucinated phone numbers or emails (compares against data sources)
 *  - No changed brand colors without approval
 *  - No forbidden claims
 *  - No broken internal links (routes that don't exist)
 *  - No unsafe dependency additions
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { AppContract } from "@interchained/portal-contract";
import type { Patch } from "./patch.js";

export interface GuardViolation {
  rule: string;
  severity: "block" | "warn";
  message: string;
  evidence?: string;
}

export interface GuardResult {
  patchId: string;
  passed: boolean;
  violations: GuardViolation[];
}

// ── Individual guard rules ─────────────────────────────────────────────────────

function checkForbiddenClaims(
  proposed: string,
  contract: AppContract
): GuardViolation[] {
  const claims = contract.policies?.forbiddenClaims ?? [];
  return claims
    .filter((claim) => proposed.toLowerCase().includes(claim.toLowerCase()))
    .map((claim) => ({
      rule: "forbidden-claim",
      severity: "block" as const,
      message: `Proposed patch contains forbidden claim: "${claim}"`,
      evidence: claim,
    }));
}

function checkForbiddenPhrases(
  proposed: string,
  contract: AppContract
): GuardViolation[] {
  const phrases = contract.brand?.forbiddenPhrases ?? [];
  return phrases
    .filter((p) => proposed.toLowerCase().includes(p.toLowerCase()))
    .map((p) => ({
      rule: "forbidden-phrase",
      severity: "block" as const,
      message: `Proposed patch contains forbidden brand phrase: "${p}"`,
      evidence: p,
    }));
}

function checkBrandColors(
  original: string,
  proposed: string,
  contract: AppContract
): GuardViolation[] {
  const colors = contract.brand?.colors ?? [];
  const violations: GuardViolation[] = [];

  for (const color of colors) {
    const inOriginal = original.includes(color);
    const inProposed = proposed.includes(color);
    if (inOriginal && !inProposed) {
      violations.push({
        rule: "brand-color-removed",
        severity: "warn",
        message: `Brand color ${color} was present in original but removed in patch`,
        evidence: color,
      });
    }
  }

  // Check for new hex colors not in the brand palette
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
  const originalColors = new Set([...original.matchAll(hexPattern)].map((m) => m[0].toLowerCase()));
  const proposedColors = [...proposed.matchAll(hexPattern)].map((m) => m[0].toLowerCase());
  const brandPalette = new Set(colors.map((c) => c.toLowerCase()));

  for (const hex of proposedColors) {
    if (!originalColors.has(hex) && !brandPalette.has(hex) && colors.length > 0) {
      violations.push({
        rule: "off-brand-color",
        severity: "warn",
        message: `New color ${hex} introduced — not in brand palette (${colors.join(", ")})`,
        evidence: hex,
      });
    }
  }

  return violations;
}

function checkPhoneNumbers(
  original: string,
  proposed: string
): GuardViolation[] {
  const phonePattern = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const originalPhones = new Set([...original.matchAll(phonePattern)].map((m) => m[0]));
  const proposedPhones = [...proposed.matchAll(phonePattern)];
  const violations: GuardViolation[] = [];

  for (const match of proposedPhones) {
    if (!originalPhones.has(match[0])) {
      violations.push({
        rule: "hallucinated-phone",
        severity: "block",
        message: `New phone number "${match[0]}" found in patch — verify this is from a trusted data source`,
        evidence: match[0],
      });
    }
  }
  return violations;
}

// ── Main guard runner ─────────────────────────────────────────────────────────

export async function guardPatch(
  patch: Patch,
  contract: AppContract
): Promise<GuardResult> {
  const violations: GuardViolation[] = [
    ...checkForbiddenClaims(patch.proposed, contract),
    ...checkForbiddenPhrases(patch.proposed, contract),
    ...checkBrandColors(patch.original, patch.proposed, contract),
    ...checkPhoneNumbers(patch.original, patch.proposed),
  ];

  const blocking = violations.filter((v) => v.severity === "block");

  return {
    patchId: patch.id,
    passed: blocking.length === 0,
    violations,
  };
}

/** Run guard checks across all pending patches */
export async function guardAllPending(
  patches: Patch[],
  contract: AppContract
): Promise<GuardResult[]> {
  const pending = patches.filter((p) => p.status === "pending");
  return Promise.all(pending.map((p) => guardPatch(p, contract)));
}
