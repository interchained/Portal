/**
 * portal test — run project tests and framework-aware checks.
 */

import { access } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import ora from "ora";
import { execa } from "execa";
import { banner, success, fail, step, blank } from "../utils/print.js";

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function testCommand(opts: { watch?: boolean } = {}): Promise<void> {
  banner();

  const root = process.cwd();

  // Detect test runner
  const hasVitest = await exists(join(root, "node_modules", "vitest"));
  const hasJest   = await exists(join(root, "node_modules", "jest"));

  let runner: string[];
  let label: string;

  if (hasVitest) {
    runner = ["vitest", opts.watch ? "" : "run"].filter(Boolean);
    label  = "Vitest";
  } else if (hasJest) {
    runner = ["jest", ...(opts.watch ? ["--watch"] : [])];
    label  = "Jest";
  } else {
    // Fallback: TypeScript type check
    step("No test runner found (vitest/jest) — running tsc --noEmit");
    label  = "TypeScript";
    runner = ["tsc", "--noEmit"];
  }

  step(`Running ${label}…`);
  blank();

  try {
    await execa("npx", runner, {
      stdio: "inherit",
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    blank();
    success("Tests passed");
  } catch (err) {
    blank();
    fail("Tests failed");
    const code = (err as { exitCode?: number }).exitCode ?? 1;
    process.exit(code);
  }
}
