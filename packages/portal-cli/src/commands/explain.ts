/**
 * portal explain <file> — explain a route, component, contract, or project
 * structure in plain English using AI.
 */

import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import pc from "picocolors";
import ora from "ora";
import { AiAssistClient } from "@interchained/portal-agent";
import { banner, fail, blank } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";

export async function explainCommand(target: string): Promise<void> {
  banner();

  const root     = process.cwd();
  const filePath = join(root, target);

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    fail(`Cannot read file: ${target}`);
    process.exit(1);
  }

  const contract = await loadContract(root);
  const ext      = extname(target);
  const isContract = target.includes("contract");
  const isAgent    = target.includes("agent");

  const fileType =
    isContract ? "app contract" :
    isAgent    ? "agent definition" :
    ext === ".tsx" || ext === ".jsx" ? "React component/page" :
    ext === ".ts"  ? "TypeScript module" :
    "file";

  let client: AiAssistClient;
  try {
    client = AiAssistClient.fromEnv();
  } catch {
    fail("AIASSIST_API_KEY not set — portal explain requires AI.");
    process.exit(1);
  }

  const spinner = ora(`Explaining ${target}…`).start();

  const systemPrompt = `You are a senior developer explaining code to a teammate.
Be clear, concrete, and direct. No jargon without explanation. Use plain paragraphs.
Reference the app contract context where relevant.
App: ${contract.name}
Goals: ${contract.goals.slice(0, 3).join("; ")}`;

  const prompt = `Explain this ${fileType} in plain English.
Cover: what it does, why it exists, how it fits the app, and any notable patterns or gotchas.
Keep it to 3–5 paragraphs.

File: ${target}
\`\`\`${ext.slice(1)}
${content.slice(0, 6000)}
\`\`\``;

  let explanation: string;
  try {
    explanation = await client.complete(prompt, systemPrompt, {
      temperature: 0.4,
      maxTokens: 1_500,
    });
    spinner.stop();
  } catch (err) {
    spinner.stop();
    fail(`AI request failed: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log();
  console.log(pc.bold(pc.cyan(`Explanation: ${target}`)));
  console.log(pc.dim("─".repeat(60)));
  console.log();
  console.log(explanation);
  blank();
}
