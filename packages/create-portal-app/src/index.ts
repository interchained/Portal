#!/usr/bin/env node
/**
 * create-portal-app — scaffold a new Portal project.
 *
 * Usage:
 *   npm create portal-app
 *   npm create portal-app my-site
 *   npm create portal-app my-site --template startup-landing
 */

import { mkdir, cp, readFile, writeFile, readdir } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import prompts from "prompts";
import pc from "picocolors";
import ora from "ora";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

type Template = "blank" | "startup-landing";

const TEMPLATES: { name: string; value: Template; description: string }[] = [
  { name: "blank",           value: "blank",           description: "Minimal Portal app — just the essentials" },
  { name: "startup-landing", value: "startup-landing", description: "High-converting startup landing page" },
];

function banner(): void {
  console.log(
    "\n" +
    pc.bold(`  ${pc.cyan("⬡")} ${pc.white("create-portal-app")}`) +
    pc.dim("  ─  ") +
    pc.dim("agent-native web framework by Interchained") +
    "\n"
  );
}

async function replaceInFile(filePath: string, replacements: Record<string, string>): Promise<void> {
  let content = await readFile(filePath, "utf-8");
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replaceAll(from, to);
  }
  await writeFile(filePath, content, "utf-8");
}

async function detectPackageManager(): Promise<"pnpm" | "npm" | "yarn"> {
  try { execSync("pnpm --version", { stdio: "ignore" }); return "pnpm"; } catch { /* */ }
  try { execSync("yarn --version", { stdio: "ignore" }); return "yarn"; } catch { /* */ }
  return "npm";
}

async function main(): Promise<void> {
  banner();

  const argName    = process.argv[2];
  const argTemplate = process.argv.indexOf("--template") !== -1
    ? process.argv[process.argv.indexOf("--template") + 1] as Template
    : undefined;

  const { projectName } = argName
    ? { projectName: argName }
    : await prompts({
        type: "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-portal",
        validate: (v) => /^[a-zA-Z0-9_-]+$/.test(v) || "Use letters, numbers, hyphens, underscores",
      });

  if (!projectName) {
    console.log(pc.red("Cancelled."));
    process.exit(0);
  }

  const { template } = argTemplate
    ? { template: argTemplate }
    : await prompts({
        type: "select",
        name: "template",
        message: "Choose a template:",
        choices: TEMPLATES.map((t) => ({
          title: `${pc.bold(t.name)} ${pc.dim("—")} ${pc.dim(t.description)}`,
          value: t.value,
        })),
      });

  if (!template) {
    console.log(pc.red("Cancelled."));
    process.exit(0);
  }

  const { installDeps } = await prompts({
    type: "confirm",
    name: "installDeps",
    message: "Install dependencies now?",
    initial: true,
  });

  const targetDir = resolve(process.cwd(), projectName);

  console.log();
  const spinner = ora(`Scaffolding ${pc.bold(projectName)}…`).start();

  // Copy template
  const templateDir = join(TEMPLATES_DIR, template);
  await mkdir(targetDir, { recursive: true });
  await cp(templateDir, targetDir, { recursive: true });

  // Replace {{PROJECT_NAME}} placeholder in all files
  const replacements = { "{{PROJECT_NAME}}": projectName };
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (
        entry.name.endsWith(".ts") ||
        entry.name.endsWith(".tsx") ||
        entry.name.endsWith(".json") ||
        entry.name.endsWith(".html") ||
        entry.name.endsWith(".md")
      ) {
        await replaceInFile(full, replacements);
      }
    }
  };
  await walk(targetDir);

  spinner.stop();
  console.log(pc.green(`✓ Scaffolded ${pc.bold(projectName)}`));

  if (installDeps) {
    const pm = await detectPackageManager();
    const installSpinner = ora(`Installing dependencies with ${pm}…`).start();
    try {
      execSync(`${pm} install`, { cwd: targetDir, stdio: "pipe" });
      installSpinner.stop();
      console.log(pc.green(`✓ Dependencies installed`));
    } catch {
      installSpinner.stop();
      console.log(pc.yellow(`⚠ Install failed — run "${pm} install" manually`));
    }
  }

  console.log();
  console.log(pc.bold("  Next steps:"));
  console.log();
  console.log(pc.dim(`    cd ${projectName}`));
  if (!installDeps) console.log(pc.dim(`    npm install`));
  console.log(pc.dim(`    portal dev`));
  console.log();
  console.log(pc.dim(`  When you're ready:`));
  console.log(pc.dim(`    portal audit`));
  console.log(pc.dim(`    portal generate page "Your new page idea"`));
  console.log();
  console.log(`  ${pc.cyan("⬡")} ${pc.bold(pc.white("Portal"))} ${pc.dim("—")} ${pc.dim("https://github.com/interchained/portal")}`);
  console.log();
}

main().catch((err) => {
  console.error(pc.red((err as Error).message));
  process.exit(1);
});
