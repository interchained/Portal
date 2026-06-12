#!/usr/bin/env node
/**
 * Portal CLI — v1.1
 * The agent-native web framework by Interchained.
 */

import { program } from "commander";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { devCommand }              from "./commands/dev.js";
import { buildCommand }            from "./commands/build.js";
import { previewCommand }          from "./commands/preview.js";
import { doctorCommand }           from "./commands/doctor.js";
import { auditCommand }            from "./commands/audit.js";
import { explainCommand }          from "./commands/explain.js";
import { generateCommand }         from "./commands/generate.js";
import { improveCommand }          from "./commands/improve.js";
import { guardCommand }            from "./commands/guard.js";
import { patchCommand }            from "./commands/patch.js";
import { rollbackCommand }         from "./commands/rollback.js";
import { testCommand }             from "./commands/test.js";
import { lintCommand }             from "./commands/lint.js";
import { deployCommand }           from "./commands/deploy.js";
import { adapterAddCommand }       from "./commands/adapter.js";
import { agentListCommand, agentRunCommand } from "./commands/agent-cmd.js";
import {
  contractValidateCommand,
  contractInitCommand,
} from "./commands/contract-cmd.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
) as { version: string };

program
  .name("portal")
  .description("Portal — agent-native web framework by Interchained")
  .version(pkg.version, "-v, --version");

// ── Dev & build ───────────────────────────────────────────────────────────────

program
  .command("dev")
  .description("Start the Portal dev server")
  .option("-p, --port <number>", "Port", parseInt)
  .option("-H, --host", "Expose to all network interfaces")
  .option("-o, --open", "Open in browser")
  .action((opts) => devCommand(opts));

program
  .command("build")
  .description("Build for production")
  .option("--out-dir <dir>", "Output directory", "dist")
  .option("--mode <mode>", "Build mode", "production")
  .option("--ssr", "Enable SSR build")
  .action((opts) => buildCommand(opts));

program
  .command("preview")
  .description("Run the production build locally")
  .option("-p, --port <number>", "Port", parseInt)
  .action((opts) => previewCommand(opts));

// ── Health & docs ─────────────────────────────────────────────────────────────

program
  .command("doctor")
  .description("Check environment, config, contracts, and routes for issues")
  .action(() => doctorCommand());

program
  .command("explain <target>")
  .description("Explain a route, component, or contract in plain English")
  .action((target) => explainCommand(target));

// ── Audit & improve ───────────────────────────────────────────────────────────

program
  .command("audit")
  .description("Audit the app against its contract (SEO, CTA, brand, a11y, quality)")
  .option("--ai", "Enable AI-powered deep analysis")
  .option("--json", "Output as JSON")
  .option("--category <cat>", "seo | cta | links | brand | accessibility | quality")
  .option("--routes-dir <dir>", "Path to routes directory")
  .action((opts) => auditCommand(opts));

program
  .command("improve [target]")
  .description("Generate AI patches to fix audit findings")
  .option("--target <cat>", "Only fix one category")
  .option("--auto", "Apply without prompting")
  .option("--no-sentinel", "Skip sentinel review")
  .option("--routes-dir <dir>", "Path to routes directory")
  .action((target, opts) =>
    improveCommand({ ...opts, target: target ?? opts.target })
  );

// ── Generation ────────────────────────────────────────────────────────────────

program
  .command("generate <type> <description>")
  .description("Generate: page | component | api | landing")
  .option("-r, --route <path>", "Explicit route path, e.g. /about")
  .option("--auto", "Write immediately without approval")
  .option("--no-sentinel", "Skip sentinel review")
  .action((type, description, opts) =>
    generateCommand(
      type as "page" | "landing" | "component" | "api",
      description,
      opts
    )
  );

// ── Agent safety ──────────────────────────────────────────────────────────────

program
  .command("guard")
  .description("Run safety checks on pending patches")
  .option("--apply", "Apply patches that pass all guard checks")
  .action((opts) => guardCommand(opts));

program
  .command("patch")
  .description("Review and apply a pending agent-generated patch")
  .action(() => patchCommand());

program
  .command("rollback [id]")
  .description("Revert the last applied Portal patch")
  .action((id) => rollbackCommand({ id }));

// ── Engineering discipline ────────────────────────────────────────────────────

program
  .command("test")
  .description("Run project tests and framework-aware checks")
  .option("--watch", "Run in watch mode")
  .action((opts) => testCommand(opts));

program
  .command("lint")
  .description("ESLint + TypeScript + contract schema validation")
  .action(() => lintCommand());

// ── Deployment ────────────────────────────────────────────────────────────────

program
  .command("deploy")
  .description("Build and prepare deployment (static | node | docker)")
  .option("--adapter <name>", "static | node | docker")
  .option("--out-dir <dir>", "Output directory", "dist")
  .option("--tag <tag>", "Docker image tag")
  .action((opts) => deployCommand({ adapter: opts.adapter, outDir: opts.outDir, tag: opts.tag }));

// ── Adapters ──────────────────────────────────────────────────────────────────

const adapter = program
  .command("adapter")
  .description("Manage deployment adapters");

adapter
  .command("add <name>")
  .description("Add a deployment adapter config (static | node | docker)")
  .action((name) => adapterAddCommand(name));

// ── Agent management ──────────────────────────────────────────────────────────

const agent = program
  .command("agent")
  .description("Manage and run Portal agents");

agent
  .command("list")
  .description("List all configured agents and their permissions")
  .action(() => agentListCommand());

agent
  .command("run <name>")
  .description("Run a specific agent task manually")
  .action((name) => agentRunCommand(name));

// ── Contract ──────────────────────────────────────────────────────────────────

const contract = program
  .command("contract")
  .description("Manage app contracts");

contract
  .command("validate")
  .description("Validate app.contract.ts and all related contract files")
  .action(() => contractValidateCommand());

contract
  .command("init")
  .description("Scaffold default contracts for a new or existing Portal app")
  .action(() => contractInitCommand());

program.parse(process.argv);
