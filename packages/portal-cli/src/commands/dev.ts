/**
 * portal dev — starts the Vite dev server with Portal plugin.
 */

import { join } from "node:path";
import { execa } from "execa";
import pc from "picocolors";
import { banner, info, step } from "../utils/print.js";

export interface DevOptions {
  port?: number;
  host?: boolean;
  open?: boolean;
}

export async function devCommand(opts: DevOptions = {}): Promise<void> {
  banner();

  const root = process.cwd();
  const viteConfig = join(root, "vite.config.ts");

  step(`Starting dev server${opts.port ? ` on port ${opts.port}` : ""}…`);
  console.log(pc.dim(`  root: ${root}`));
  console.log();

  const args = ["vite", "--config", viteConfig];
  if (opts.port) args.push("--port", String(opts.port));
  if (opts.host) args.push("--host");
  if (opts.open) args.push("--open");

  try {
    await execa("npx", args, {
      stdio: "inherit",
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "1" },
    });
  } catch (err) {
    // Vite exits non-zero on SIGINT — that's fine
    const code = (err as { exitCode?: number }).exitCode;
    if (code !== 0 && code !== null && code !== undefined) {
      process.exit(code);
    }
  }
}
