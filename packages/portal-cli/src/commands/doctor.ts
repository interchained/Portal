/**
 * portal doctor — environment + project health check.
 * Runs before you let agents near your code.
 */

import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { banner, header, success, warn, fail, info, blank } from "../utils/print.js";
import { loadContract, findContractPath } from "../utils/contract.js";

interface Check {
  label: string;
  status: "ok" | "warn" | "fail";
  detail?: string;
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function doctorCommand(): Promise<void> {
  banner();
  header("Portal Doctor");

  const root    = process.cwd();
  const checks: Check[] = [];

  // Node version
  const nodeVer = process.version;
  const nodeMaj = parseInt(nodeVer.slice(1), 10);
  checks.push({
    label: `Node.js ${nodeVer}`,
    status: nodeMaj >= 18 ? "ok" : "fail",
    detail: nodeMaj < 18 ? "Portal requires Node.js 18 or newer" : undefined,
  });

  // vite.config.ts / portal.config.ts
  const hasViteConfig =
    (await exists(join(root, "vite.config.ts"))) ||
    (await exists(join(root, "vite.config.js"))) ||
    (await exists(join(root, "portal.config.ts")));
  checks.push({
    label: "vite.config.ts",
    status: hasViteConfig ? "ok" : "warn",
    detail: !hasViteConfig ? "No Vite config found — run: npm create portal-app" : undefined,
  });

  // app.contract.ts
  const contractPath = await findContractPath(root);
  checks.push({
    label: "app.contract.ts",
    status: contractPath ? "ok" : "warn",
    detail: !contractPath
      ? "No contract found — run: portal contract init"
      : undefined,
  });

  // routes/ directory
  const routesDir = join(root, "routes");
  const hasRoutes = await exists(routesDir);
  let routeCount = 0;
  if (hasRoutes) {
    try {
      const entries = await readdir(routesDir, { recursive: true });
      routeCount = (entries as string[]).filter(
        (e) => e.endsWith(".page.tsx") || e.endsWith(".page.jsx")
      ).length;
    } catch { /* */ }
  }
  checks.push({
    label: `routes/ (${routeCount} page${routeCount !== 1 ? "s" : ""})`,
    status: hasRoutes && routeCount > 0 ? "ok" : "warn",
    detail: !hasRoutes
      ? "No routes/ directory found"
      : routeCount === 0
      ? "routes/ exists but has no *.page.tsx files"
      : undefined,
  });

  // package.json
  const hasPkg = await exists(join(root, "package.json"));
  checks.push({
    label: "package.json",
    status: hasPkg ? "ok" : "fail",
    detail: !hasPkg ? "No package.json — are you in the right directory?" : undefined,
  });

  // AI API key
  const hasApiKey =
    !!process.env["AIASSIST_API_KEY"] || !!process.env["VITE_AIAS_API_KEY"];
  checks.push({
    label: "AIASSIST_API_KEY",
    status: hasApiKey ? "ok" : "warn",
    detail: !hasApiKey
      ? "Not set — portal audit --ai, portal improve, and portal generate require this"
      : undefined,
  });

  // Data files referenced in contract
  if (contractPath) {
    const contract = await loadContract(root);
    for (const [name, filePath] of Object.entries(contract.data ?? {})) {
      const fullPath = join(root, filePath);
      const fileExists = await exists(fullPath);
      checks.push({
        label: `data.${name} (${filePath})`,
        status: fileExists ? "ok" : "warn",
        detail: !fileExists ? `Data file missing: ${filePath}` : undefined,
      });
    }

    // Check for unreplaced tokens in contract name
    if (contract.name.includes("{{")) {
      checks.push({
        label: "contract.name",
        status: "fail",
        detail: `Contract name contains unreplaced token: "${contract.name}"`,
      });
    }
  }

  // Print results
  blank();
  for (const check of checks) {
    if (check.status === "ok") {
      success(check.label);
    } else if (check.status === "warn") {
      warn(check.label);
      if (check.detail) console.log(pc.dim(`   ${check.detail}`));
    } else {
      fail(check.label);
      if (check.detail) console.log(pc.red(`   ${check.detail}`));
    }
  }

  blank();
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  if (failCount > 0) {
    fail(`${failCount} critical issue${failCount !== 1 ? "s" : ""} found — fix before proceeding`);
    process.exit(1);
  } else if (warnCount > 0) {
    warn(`${warnCount} warning${warnCount !== 1 ? "s" : ""} — not blocking, but worth fixing`);
  } else {
    success("All checks passed — project looks healthy");
  }
  blank();
}
