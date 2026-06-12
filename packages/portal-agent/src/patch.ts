/**
 * Safe patch system — preview, approval, and application.
 *
 * Every agent-generated change is represented as a Patch.
 * Patches with requiresApproval=true are shown as diffs
 * and must be explicitly approved before being written to disk.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type PatchStatus = "pending" | "approved" | "rejected" | "applied";

export interface Patch {
  id: string;
  /** Agent that generated this patch */
  agent: string;
  /** Path relative to project root */
  file: string;
  original: string;
  proposed: string;
  /** Human-readable reason for the change */
  reason: string;
  requiresApproval: boolean;
  status: PatchStatus;
  createdAt: string;
  /** Sentinel review (if sentinel ran) */
  sentinelApproved?: boolean;
  sentinelSummary?: string;
  sentinelViolations?: string[];
}

// ── Patch store (file-backed, .portal/patches/) ───────────────────────────────

export class PatchStore {
  private dir: string;

  constructor(projectRoot: string) {
    this.dir = join(projectRoot, ".portal", "patches");
  }

  async save(patch: Patch): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      join(this.dir, `${patch.id}.json`),
      JSON.stringify(patch, null, 2),
      "utf-8"
    );
  }

  async load(id: string): Promise<Patch | null> {
    try {
      const raw = await readFile(join(this.dir, `${id}.json`), "utf-8");
      return JSON.parse(raw) as Patch;
    } catch {
      return null;
    }
  }

  async list(): Promise<Patch[]> {
    const { readdir } = await import("node:fs/promises");
    try {
      const files = await readdir(this.dir);
      const patches: Patch[] = [];
      for (const f of files) {
        if (f.endsWith(".json")) {
          try {
            const raw = await readFile(join(this.dir, f), "utf-8");
            patches.push(JSON.parse(raw) as Patch);
          } catch { /* skip corrupt */ }
        }
      }
      return patches.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [];
    }
  }

  async update(id: string, updates: Partial<Patch>): Promise<void> {
    const patch = await this.load(id);
    if (!patch) throw new Error(`Patch ${id} not found`);
    await this.save({ ...patch, ...updates });
  }
}

// ── Patch factory ─────────────────────────────────────────────────────────────

export function createPatch(opts: Omit<Patch, "id" | "createdAt" | "status">): Patch {
  return {
    ...opts,
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

// ── Apply ─────────────────────────────────────────────────────────────────────

export async function applyPatch(
  patch: Patch,
  projectRoot: string,
  store: PatchStore
): Promise<void> {
  if (patch.status !== "approved" && patch.requiresApproval) {
    throw new Error(`Patch ${patch.id} requires approval before applying`);
  }
  const filePath = join(projectRoot, patch.file);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, patch.proposed, "utf-8");
  await store.update(patch.id, { status: "applied" });
}

// ── Inline diff (terminal-friendly) ──────────────────────────────────────────

export function inlineDiff(original: string, proposed: string): string {
  const oLines = original.split("\n");
  const pLines = proposed.split("\n");
  const lines: string[] = [];

  const maxLen = Math.max(oLines.length, pLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oLines[i];
    const p = pLines[i];
    if (o === p) {
      lines.push(`  ${o ?? ""}`);
    } else {
      if (o !== undefined) lines.push(`- ${o}`);
      if (p !== undefined) lines.push(`+ ${p}`);
    }
  }
  return lines.join("\n");
}
