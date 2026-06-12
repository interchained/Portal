/**
 * Portal Audit Engine — v1.1
 *
 * Runs structured checks across all route files against the app contract.
 * Quality gates in the contract promote specific warns to hard fails.
 *
 * Categories: seo · cta · links · brand · accessibility · quality
 */

import { readFile, readdir } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import type {
  AppContract,
  PageContract,
  QualityGatesContract,
} from "@interchained/portal-contract";
import { Runner } from "./runner.js";

export type CheckCategory =
  | "seo"
  | "cta"
  | "links"
  | "brand"
  | "accessibility"
  | "quality";
export type CheckStatus = "pass" | "warn" | "fail";

export interface AuditFinding {
  category: CheckCategory;
  status: CheckStatus;
  file: string;
  message: string;
  suggestion?: string;
  line?: number;
}

export interface AuditReport {
  timestamp: string;
  appName: string;
  routesDir: string;
  findings: AuditFinding[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
    total: number;
  };
}

// ── Gate helpers ──────────────────────────────────────────────────────────────

function gated(
  gates: QualityGatesContract | undefined,
  gate: keyof QualityGatesContract,
  defaultStatus: CheckStatus = "warn"
): CheckStatus {
  return gates?.[gate] === true ? "fail" : defaultStatus;
}

// ── Static checks ─────────────────────────────────────────────────────────────

function checkSeoStatic(
  content: string,
  file: string,
  page: PageContract | undefined,
  contract: AppContract
): AuditFinding[] {
  const gates = contract.qualityGates;
  const findings: AuditFinding[] = [];
  const rel = relative(process.cwd(), file);

  const hasHeadTitle =
    content.includes("<Head") ||
    content.includes("useHead") ||
    /title\s*[:=]/.test(content);

  if (!hasHeadTitle) {
    findings.push({
      category: "seo",
      status: gated(gates, "requireMetaTitle"),
      file: rel,
      message: "No <Head title> found — page is missing title metadata",
      suggestion: `Add <Head title="..." description="..." /> from @interchained/portal-react`,
    });
  }

  const hasDescription =
    /description\s*[:=]/.test(content) || content.includes("meta name=\"description\"");

  if (!hasDescription) {
    findings.push({
      category: "seo",
      status: gated(gates, "requireMetaDescription"),
      file: rel,
      message: "No meta description found",
      suggestion: "Add a description prop to <Head>",
    });
  }

  if (!/<h1[\s>]/i.test(content)) {
    findings.push({
      category: "seo",
      status: gated(gates, "requireH1"),
      file: rel,
      message: "No <h1> element found — every page needs exactly one h1",
      suggestion: "Add an <h1> with your primary heading",
    });
  }

  const seoKeyword =
    page?.seoKeyword ?? contract.seo?.primaryKeyword;
  if (seoKeyword && !content.toLowerCase().includes(seoKeyword.toLowerCase())) {
    findings.push({
      category: "seo",
      status: "warn",
      file: rel,
      message: `Target SEO keyword "${seoKeyword}" not found in page content`,
      suggestion: `Include "${seoKeyword}" naturally in headings or body copy`,
    });
  }

  return findings;
}

function checkCtaStatic(
  content: string,
  file: string,
  gates: QualityGatesContract | undefined
): AuditFinding[] {
  const rel = relative(process.cwd(), file);
  const hasCta = /<button|<Button|<Link[\s>]|href=|onClick/i.test(content);

  if (!hasCta) {
    return [
      {
        category: "cta",
        status: gated(gates, "requirePrimaryCTA"),
        file: rel,
        message: "No call-to-action found (button, link, or click handler)",
        suggestion: "Every page should guide the user toward a specific action",
      },
    ];
  }
  return [];
}

function checkAccessibilityStatic(
  content: string,
  file: string,
  level: "basic" | "strict",
  gates: QualityGatesContract | undefined
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const rel = relative(process.cwd(), file);

  for (const match of content.matchAll(/<img\s[^>]*>/gi)) {
    if (!/alt\s*=/i.test(match[0])) {
      findings.push({
        category: "accessibility",
        status: gated(gates, "requireAltText", level === "strict" ? "fail" : "warn"),
        file: rel,
        message: "<img> tag missing alt attribute",
        suggestion: `Add alt="" (decorative) or descriptive alt text`,
      });
    }
  }

  if (level === "strict" && !/<main[\s>]/i.test(content)) {
    findings.push({
      category: "accessibility",
      status: "warn",
      file: rel,
      message: "No <main> landmark element found",
      suggestion: "Wrap primary content in <main> for screen readers",
    });
  }

  return findings;
}

function checkBrandStatic(
  content: string,
  file: string,
  contract: AppContract
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const rel = relative(process.cwd(), file);

  for (const phrase of contract.brand?.forbiddenPhrases ?? []) {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      findings.push({
        category: "brand",
        status: "fail",
        file: rel,
        message: `Forbidden brand phrase found: "${phrase}"`,
        suggestion: "Remove or replace — this phrase violates brand guidelines",
      });
    }
  }

  return findings;
}

function checkQualityStatic(
  content: string,
  file: string,
  gates: QualityGatesContract | undefined
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const rel = relative(process.cwd(), file);

  if (gates?.forbidPlaceholderCopy) {
    const placeholders = ["lorem ipsum", "placeholder text", "todo:", "fixme:"];
    for (const p of placeholders) {
      if (content.toLowerCase().includes(p)) {
        findings.push({
          category: "quality",
          status: "fail",
          file: rel,
          message: `Placeholder copy found: "${p}"`,
          suggestion: "Replace with real content before shipping",
        });
        break;
      }
    }
  }

  if (gates?.forbidUnreplacedTokens) {
    const tokenMatch = content.match(/\{\{[A-Z_]+\}\}/);
    if (tokenMatch) {
      findings.push({
        category: "quality",
        status: "fail",
        file: rel,
        message: `Unreplaced template token found: "${tokenMatch[0]}"`,
        suggestion: "Replace all {{TOKEN}} values with real content",
      });
    }
  }

  return findings;
}

// ── Route discovery ───────────────────────────────────────────────────────────

async function findRouteFiles(routesDir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(routesDir, { recursive: true });
    for (const entry of entries) {
      if (typeof entry === "string") {
        const ext = extname(entry);
        if ([".tsx", ".jsx", ".ts", ".js"].includes(ext)) {
          files.push(join(routesDir, entry));
        }
      }
    }
  } catch {
    // routesDir doesn't exist
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runAudit(
  contract: AppContract,
  routesDir: string,
  options: { ai?: boolean; runner?: Runner } = {}
): Promise<AuditReport> {
  const files = await findRouteFiles(routesDir);
  const allFindings: AuditFinding[] = [];
  const accessibility = contract.policies?.accessibility ?? "basic";
  const gates = contract.qualityGates;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const rel = relative(process.cwd(), file);

    const routeSlug = rel
      .replace(/^routes\//, "")
      .replace(/\.page\.(tsx|jsx|ts|js)$/, "")
      .replace(/index$/, "");
    const route = "/" + routeSlug;
    const pageContract = contract.pages?.find((p) => p.route === route);

    allFindings.push(...checkSeoStatic(content, file, pageContract, contract));
    allFindings.push(...checkCtaStatic(content, file, gates));
    allFindings.push(...checkBrandStatic(content, file, contract));
    allFindings.push(...checkQualityStatic(content, file, gates));

    if (accessibility !== "none") {
      allFindings.push(
        ...checkAccessibilityStatic(
          content,
          file,
          accessibility as "basic" | "strict",
          gates
        )
      );
    }

    if (options.ai && options.runner) {
      try {
        const contractSummary = `Name: ${contract.name}\nGoals: ${contract.goals.join(", ")}`;
        const raw = await options.runner.analyzeFile({
          filePath: rel,
          content,
          checks: ["seo", "cta", "brand", "accessibility", "contract-alignment"],
          contract: contractSummary,
        });
        const jsonStr = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        const aiFindings = JSON.parse(jsonStr) as Array<{
          check: CheckCategory;
          status: CheckStatus;
          message: string;
          line?: number;
          suggestion?: string;
        }>;
        for (const f of aiFindings) {
          if (f.status !== "pass") {
            allFindings.push({
              category: f.check,
              status: f.status,
              file: rel,
              message: f.message,
              line: f.line,
              suggestion: f.suggestion,
            });
          }
        }
      } catch {
        // AI analysis is best-effort
      }
    }
  }

  const pass  = allFindings.filter((f) => f.status === "pass").length;
  const warn  = allFindings.filter((f) => f.status === "warn").length;
  const fail  = allFindings.filter((f) => f.status === "fail").length;

  return {
    timestamp: new Date().toISOString(),
    appName:   contract.name,
    routesDir,
    findings:  allFindings,
    summary:   { pass, warn, fail, total: allFindings.length },
  };
}
