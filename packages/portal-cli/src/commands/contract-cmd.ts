/**
 * portal contract validate — validate all contract files
 * portal contract init     — scaffold default contracts for existing apps
 */

import { writeFile, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { validateContract } from "@interchained/portal-contract";
import { banner, header, success, fail, warn, info, blank } from "../utils/print.js";
import { loadContract, findContractPath } from "../utils/contract.js";

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

// ── portal contract validate ──────────────────────────────────────────────────

export async function contractValidateCommand(): Promise<void> {
  banner();
  header("Contract Validation");
  blank();

  const root = process.cwd();
  let failed = false;

  // Find and load contract
  const contractPath = await findContractPath(root);
  if (!contractPath) {
    fail("No app.contract.ts found — run: portal contract init");
    process.exit(1);
  }

  let contract: ReturnType<typeof validateContract>;
  try {
    contract = await loadContract(root);
    validateContract(contract);
    success("Contract schema valid");
  } catch (err) {
    fail(`Contract schema invalid: ${(err as Error).message}`);
    failed = true;
  }

  if (!failed) {
    // Unreplaced template tokens
    const contractStr = JSON.stringify(contract!);
    const tokens = contractStr.match(/\{\{[A-Z_]+\}\}/g);
    if (tokens) {
      const unique = [...new Set(tokens)];
      for (const tok of unique) {
        fail(`Unreplaced token: ${tok}`);
      }
      failed = true;
    } else {
      success("No unreplaced template tokens");
    }

    // Required fields
    if (!contract!.name?.trim()) {
      fail("contract.name is empty"); failed = true;
    } else {
      success(`name: "${contract!.name}"`);
    }

    if (!contract!.goals?.length) {
      fail("contract.goals is empty"); failed = true;
    } else {
      success(`goals: ${contract!.goals.length} defined`);
    }

    // Pages
    const pages = contract!.pages ?? [];
    let pageIssues = 0;
    for (const page of pages) {
      if (!page.purpose?.trim()) {
        warn(`Page "${page.route}" has no purpose`);
        pageIssues++;
      }
      if (!page.primaryAction?.trim()) {
        warn(`Page "${page.route}" has no primaryAction`);
      }
    }
    if (pages.length === 0) {
      warn("No pages declared in contract (optional but recommended)");
    } else if (pageIssues === 0) {
      success(`pages: ${pages.length} declared, all have purpose`);
    }

    // Data files
    const data = contract!.data ?? {};
    let missingData = 0;
    for (const [name, filePath] of Object.entries(data)) {
      const full = join(root, filePath);
      if (!(await exists(full))) {
        warn(`data.${name}: file missing (${filePath})`);
        missingData++;
      } else {
        success(`data.${name}: found`);
      }
    }
  }

  blank();
  if (failed) {
    fail("Contract validation failed — fix the issues above");
    process.exit(1);
  } else {
    success("Contract is valid and ready for agent operations");
    blank();
  }
}

// ── portal contract init ──────────────────────────────────────────────────────

const DEFAULT_CONTRACT = (name: string, description: string) => `import { defineApp } from "@interchained/portal-contract";

export default defineApp({
  name: "${name}",
  version: "1.1.0",

  description: "${description}",

  goals: [
    "Describe the first thing this app is trying to accomplish",
    "And the second",
  ],

  brand: {
    voice: "clear, direct, professional",
    colors: ["#0f172a", "#6366f1", "#f8fafc"],
    forbiddenPhrases: ["world-class", "best-in-class", "game-changer"],
  },

  policies: {
    publishing:    "human_review",
    accessibility: "basic",
    forbiddenClaims: [],
  },

  qualityGates: {
    requireMetaTitle:       true,
    requireMetaDescription: true,
    requireH1:              true,
    requirePrimaryCTA:      true,
    forbidPlaceholderCopy:  true,
  },

  pages: [],
});
`;

const DEFAULT_AGENT_CONFIG = `import { defineAgent } from "@interchained/portal-contract";

// Add your agents here — run with: portal agent run <name>

export const seoAgent = defineAgent({
  name: "seo-reviewer",
  model: "fast",
  sentinel: "smart",
  task: "Review page for SEO gaps and suggest improvements",
  canPatch: true,
  requiresApproval: true,
});
`;

export async function contractInitCommand(): Promise<void> {
  banner();

  const root = process.cwd();

  // Check existing
  const existing = await findContractPath(root);
  if (existing) {
    info(`Contract already exists: ${existing}`);
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "Overwrite it?",
      initial: false,
    });
    if (!overwrite) { blank(); return; }
  }

  const { appName } = await prompts({
    type: "text",
    name: "appName",
    message: "App name:",
    initial: root.split("/").pop() ?? "my-portal",
  });

  const { description } = await prompts({
    type: "text",
    name: "description",
    message: "One-line description:",
    initial: "A Portal web application",
  });

  if (!appName) { blank(); return; }

  // Write app.contract.ts
  await writeFile(
    join(root, "app.contract.ts"),
    DEFAULT_CONTRACT(appName, description || "A Portal web application"),
    "utf-8"
  );
  success("Created: app.contract.ts");

  // Write agent.config.ts if it doesn't exist
  const agentConfigPath = join(root, "agent.config.ts");
  if (!(await exists(agentConfigPath))) {
    await writeFile(agentConfigPath, DEFAULT_AGENT_CONFIG, "utf-8");
    success("Created: agent.config.ts");
  }

  // Create agents/ dir
  const agentsDir = join(root, "agents");
  if (!(await exists(agentsDir))) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(agentsDir, { recursive: true });
    success("Created: agents/");
  }

  blank();
  info("Next steps:");
  console.log(pc.dim("  1. Edit app.contract.ts — define your goals, brand, and policies"));
  console.log(pc.dim("  2. portal contract validate — verify it's correct"));
  console.log(pc.dim("  3. portal audit — run your first audit"));
  blank();
}
