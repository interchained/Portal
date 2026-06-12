/**
 * @interchained/portal-contract  v1.1
 *
 * The living contract — source of truth for agents, routes, SEO, audits,
 * quality gates, compliance, and deployment. Every change an agent makes
 * is checked against this before touching the codebase.
 */
// ── defineApp / defineAgent ───────────────────────────────────────────────────
/**
 * Define the living app contract.
 * Call this in `app.contract.ts` at the project root.
 *
 * @example
 * ```ts
 * export default defineApp({
 *   name: "Mint Salon",
 *   version: "1.1.0",
 *   goals: ["Help clients book appointments"],
 *   brand: { voice: "warm, polished", colors: ["#0f2f27", "#d8c7a3"] },
 *   qualityGates: { requireH1: true, requirePrimaryCTA: true },
 *   policies: { publishing: "human_review" },
 * });
 * ```
 */
export function defineApp(contract) {
    return contract;
}
export function defineAgent(def) {
    return def;
}
// ── Validation ────────────────────────────────────────────────────────────────
export function validateContract(raw) {
    if (typeof raw !== "object" || raw === null) {
        throw new Error("app.contract.ts must export a valid AppContract object");
    }
    const c = raw;
    if (typeof c.name !== "string" || !c.name.trim()) {
        throw new Error("contract.name must be a non-empty string");
    }
    if (!Array.isArray(c.goals) || c.goals.length === 0) {
        throw new Error("contract.goals must be a non-empty array of strings");
    }
    return raw;
}
//# sourceMappingURL=index.js.map