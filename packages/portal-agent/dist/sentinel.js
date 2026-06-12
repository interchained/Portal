/**
 * Sentinel — reviews, auto-corrects, and applies patches.
 *
 * The Sentinel never just rejects. Its contract:
 *  1. Review the Runner's output against the app contract
 *  2. If clean  → apply as-is
 *  3. If issues → self-correct (call AI to fix the violations)
 *  4. Apply the corrected version
 *  5. Report what was fixed
 *
 * The human always sees a result, never a gate.
 * The only terminal failure is an unrecoverable AI error.
 */
import { AiAssistClient } from "./aiassist.js";
import { applyPatch } from "./patch.js";
// ── Sentinel ──────────────────────────────────────────────────────────────────
export class Sentinel {
    client;
    constructor(config = {}) {
        this.client = new AiAssistClient({
            apiKey: config.apiKey ??
                process.env["AIASSIST_API_KEY"] ??
                process.env["VITE_AIAS_API_KEY"] ??
                "",
            baseUrl: config.baseUrl,
            model: config.model ?? "gpt-4o",
            timeoutMs: config.timeoutMs ?? 120_000,
        });
    }
    // ── 1. Review ───────────────────────────────────────────────────────────────
    async review(opts) {
        const prompt = `You are a code sentinel reviewing an AI-generated patch.
Verify the patch is safe, faithful to the app contract, and actually solves the task.

App Contract:
\`\`\`json
${JSON.stringify(opts.contract, null, 2)}
\`\`\`

Agent task: ${opts.agentTask}
File: ${opts.filePath}

ORIGINAL:
\`\`\`tsx
${opts.original}
\`\`\`

PROPOSED PATCH:
\`\`\`tsx
${opts.proposed}
\`\`\`

Check for:
1. Forbidden claims (contract.policies.forbiddenClaims)
2. Forbidden phrases (contract.brand.forbiddenPhrases)
3. Unauthorised brand color changes
4. Hallucinated data (numbers, prices, names not in data sources)
5. Whether the patch actually solves the task
6. Obvious regressions or broken imports

Respond as JSON only — no markdown fences:
{
  "approved": true,
  "summary": "one sentence",
  "violations": [],
  "annotations": []
}`;
        const raw = await this.client.complete(prompt, undefined, {
            temperature: 0.1,
            maxTokens: 2_000,
        });
        try {
            const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
            return JSON.parse(cleaned);
        }
        catch {
            return {
                approved: false,
                summary: "Sentinel could not parse its review — will attempt self-correction.",
                violations: ["Unparseable sentinel response"],
                annotations: [],
            };
        }
    }
    // ── 2. Self-correct ─────────────────────────────────────────────────────────
    async fix(opts) {
        const prompt = `You are a code sentinel. An AI agent generated a patch that has the following issues:

${opts.violations.map((v, i) => `${i + 1}. ${v}`).join("\n")}

Your job: rewrite the proposed file to fix ALL of these issues while still fulfilling the original task.
Keep every part of the patch that was correct. Only change what violates the rules.

Original task: ${opts.agentTask}
File: ${opts.filePath}

App Contract (source of truth for brand, policies, data):
\`\`\`json
${JSON.stringify(opts.contract, null, 2)}
\`\`\`

ORIGINAL FILE:
\`\`\`tsx
${opts.original}
\`\`\`

PROPOSED (with violations):
\`\`\`tsx
${opts.proposed}
\`\`\`

Respond as JSON only — no markdown fences:
{
  "correctedContent": "<full corrected file content as a string>",
  "changes": ["Fixed: ...", "Removed: ...", "Replaced: ..."],
  "summary": "one sentence describing what was corrected"
}`;
        const raw = await this.client.complete(prompt, undefined, {
            temperature: 0.2,
            maxTokens: 8_000,
        });
        try {
            const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
            return JSON.parse(cleaned);
        }
        catch {
            // Last resort: return the proposed content unchanged with a note
            return {
                correctedContent: opts.proposed,
                changes: ["Sentinel could not parse its own correction — applied original patch."],
                summary: "Correction parse failed; original patch applied.",
            };
        }
    }
    // ── 3. Review → fix if needed → apply ──────────────────────────────────────
    /**
     * The primary entry point.
     *
     * Always applies something to disk. Never rejects to the caller.
     *  - Clean patch   → apply as-is, fix undefined
     *  - Dirty patch   → self-correct → apply corrected version, fix populated
     */
    async reviewAndApply(opts) {
        // Step 1 — review
        const review = await this.review({
            contract: opts.contract,
            filePath: opts.patch.file,
            original: opts.patch.original,
            proposed: opts.patch.proposed,
            agentTask: opts.agentTask,
        });
        await opts.store.update(opts.patch.id, {
            sentinelApproved: review.approved,
            sentinelSummary: review.summary,
            sentinelViolations: review.violations,
        });
        // Step 2 — self-correct if needed
        let finalContent = opts.patch.proposed;
        let fix;
        if (!review.approved && review.violations.length > 0) {
            fix = await this.fix({
                contract: opts.contract,
                filePath: opts.patch.file,
                original: opts.patch.original,
                proposed: opts.patch.proposed,
                violations: review.violations,
                agentTask: opts.agentTask,
            });
            finalContent = fix.correctedContent;
            await opts.store.update(opts.patch.id, {
                sentinelSummary: fix.summary,
            });
        }
        // Step 3 — apply (original or corrected)
        const patchToApply = { ...opts.patch, proposed: finalContent, status: "approved" };
        await opts.store.update(opts.patch.id, { status: "approved", proposed: finalContent });
        await applyPatch(patchToApply, opts.projectRoot, opts.store);
        return { review, applied: true, fix };
    }
}
//# sourceMappingURL=sentinel.js.map