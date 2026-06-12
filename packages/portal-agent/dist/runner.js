/**
 * Runner — fast, cheap first-pass AI model.
 * Does the actual generation/analysis work.
 * Output is reviewed by the Sentinel before being applied.
 */
import { AiAssistClient } from "./aiassist.js";
export class Runner {
    client;
    constructor(config = {}) {
        this.client = new AiAssistClient({
            apiKey: config.apiKey ?? process.env["AIASSIST_API_KEY"] ?? process.env["VITE_AIAS_API_KEY"] ?? "",
            baseUrl: config.baseUrl,
            model: config.model ?? "claude-haiku-4-5-20251001",
            provider: "anthropic",
            timeoutMs: config.timeoutMs ?? 60_000,
        });
    }
    async run(task, context, systemPrompt) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({
            role: "user",
            content: `${context}\n\n---\nTASK: ${task}`,
        });
        return this.client.chat(messages, { temperature: 0.2 });
    }
    /** Generate a React page component */
    async generateComponent(opts) {
        const systemPrompt = `You are an expert React/TypeScript developer writing components for the Portal framework.
Output ONLY valid TypeScript JSX. No markdown, no explanation, no code fences.
Use Tailwind CSS for styling. Follow these rules:
- Use functional components with explicit return types
- Import from "@interchained/portal-react" for Link, Head, useNavigate, useParams
- Colors: ${opts.colors?.join(", ") ?? "follow modern design"}
- Voice/tone: ${opts.brandVoice ?? "professional and clear"}
- Always export default`;
        const prompt = `Generate a React page component for the route "${opts.route}".
Purpose: ${opts.purpose}
${opts.audience ? `Audience: ${opts.audience}` : ""}
${opts.primaryAction ? `Primary action: ${opts.primaryAction}` : ""}
The component should directly serve the stated purpose with real, compelling content.`;
        return this.client.complete(prompt, systemPrompt, { maxTokens: 3_000 });
    }
    /** Analyze a file for audit issues */
    async analyzeFile(opts) {
        const prompt = `Analyze this file for the following issues: ${opts.checks.join(", ")}.

App contract context:
${opts.contract}

File: ${opts.filePath}
\`\`\`tsx
${opts.content}
\`\`\`

Respond as JSON array of findings:
[{"check": "seo|cta|links|brand|accessibility", "status": "pass|warn|fail", "message": "...", "line": null, "suggestion": "..."}]`;
        return this.client.complete(prompt, undefined, { temperature: 0.1 });
    }
    /** Generate an improvement patch for an audit finding */
    async generatePatch(opts) {
        const systemPrompt = `You are generating a minimal, surgical patch to fix a specific issue in a React/TypeScript file.
Output ONLY the complete corrected file contents — no explanation, no markdown.`;
        const prompt = `Fix the following issue in this file:

Issue: ${opts.finding}

App contract:
${opts.contract}

File: ${opts.filePath}
\`\`\`tsx
${opts.originalContent}
\`\`\`

Return the complete corrected file. Change only what is necessary to fix the issue.`;
        return this.client.complete(prompt, systemPrompt, { temperature: 0.1, maxTokens: 4_000 });
    }
}
//# sourceMappingURL=runner.js.map