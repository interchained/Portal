/**
 * portal adapter add <name> — add a deployment/runtime adapter config.
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { banner, success, fail, info, blank } from "../utils/print.js";

const ADAPTER_CONFIGS: Record<string, string> = {
  static: `// Portal Static Adapter Config
// Build: portal build
// Output: dist/
// Deploy dist/ to any static host.
export const adapter = {
  type: "static",
  outDir: "dist",
  // Add a base path if deploying to a sub-path: base: "/my-app"
};
`,
  node: `// Portal Node.js Adapter Config
// Build: portal build
// Run: node dist/server.js
// PORT env var controls the port (default 3000).
export const adapter = {
  type: "node",
  outDir: "dist",
  port: Number(process.env.PORT ?? 3000),
  // hostname: "0.0.0.0",
};
`,
  docker: `// Portal Docker Adapter Config
// Build image: docker build -t my-app .
// Run: docker run -p 3000:3000 my-app
// See Dockerfile at project root (created by portal deploy --adapter docker).
export const adapter = {
  type: "docker",
  image: "portal-app",
  port: 3000,
};
`,
};

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function adapterAddCommand(name: string): Promise<void> {
  banner();

  const root    = process.cwd();
  const known   = Object.keys(ADAPTER_CONFIGS);

  if (!known.includes(name)) {
    fail(`Unknown adapter: "${name}"`);
    info(`Available adapters: ${known.join(", ")}`);
    process.exit(1);
  }

  const adaptersDir = join(root, "adapters");
  await mkdir(adaptersDir, { recursive: true });

  const outPath = join(adaptersDir, `${name}.adapter.ts`);
  if (await exists(outPath)) {
    info(`Adapter already exists: adapters/${name}.adapter.ts`);
    blank();
    return;
  }

  await writeFile(outPath, ADAPTER_CONFIGS[name]!, "utf-8");
  success(`Created: adapters/${name}.adapter.ts`);
  info(`Run portal deploy --adapter ${name} to use it.`);
  blank();
}
