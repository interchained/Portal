import { execa } from "execa";
import pc from "picocolors";
import { banner, step, fail } from "../utils/print.js";

export async function previewCommand(opts: { port?: number } = {}): Promise<void> {
  banner();
  step("Starting production preview…");
  console.log(pc.dim("  Make sure you have run portal build first.\n"));

  const args = ["vite", "preview"];
  if (opts.port) args.push("--port", String(opts.port));

  try {
    await execa("npx", args, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: "1" },
    });
  } catch (err) {
    const code = (err as { exitCode?: number }).exitCode;
    if (code !== 0 && code !== null && code !== undefined) {
      fail("Preview server exited with an error.");
      process.exit(code);
    }
  }
}
