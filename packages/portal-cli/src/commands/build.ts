/**
 * portal build — builds the Portal app for production.
 */

import { join } from "node:path";
import { execa } from "execa";
import pc from "picocolors";
import ora from "ora";
import { banner, success, fail } from "../utils/print.js";

export interface BuildOptions {
  outDir?: string;
  mode?: string;
  ssr?: boolean;
}

export async function buildCommand(opts: BuildOptions = {}): Promise<void> {
  banner();

  const root = process.cwd();
  const spinner = ora("Building Portal app…").start();

  const args = ["vite", "build"];
  if (opts.outDir) args.push("--outDir", opts.outDir);
  if (opts.mode)   args.push("--mode", opts.mode);
  if (opts.ssr)    args.push("--ssr", "src/entry-server.tsx");

  try {
    await execa("npx", args, {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    spinner.stop();
    success("Build complete");
    console.log(pc.dim(`  Output: ${opts.outDir ?? "dist/"}`));
  } catch (err) {
    spinner.stop();
    fail("Build failed");
    console.error(pc.red((err as Error).message));
    process.exit(1);
  }
}
