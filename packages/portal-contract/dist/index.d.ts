/**
 * @interchained/portal-contract  v1.1
 *
 * The living contract — source of truth for agents, routes, SEO, audits,
 * quality gates, compliance, and deployment. Every change an agent makes
 * is checked against this before touching the codebase.
 */
export interface BrandContract {
    voice?: string;
    colors?: string[];
    fonts?: string[];
    logo?: string;
    forbiddenPhrases?: string[];
}
export interface ConversionContract {
    /** The single most important action on the site */
    primaryGoal: string;
    secondaryGoal?: string;
    /** Analytics event names that signal success */
    successEvents?: string[];
}
export interface SeoContract {
    enabled?: boolean;
    primaryKeyword?: string;
    /** printf-style title template, e.g. "%s | My App" */
    titleTemplate?: string;
    defaultDescription?: string;
    sitemap?: boolean;
    robots?: boolean;
}
export type AuthPolicy = "none" | "optional" | "required";
export type PublishPolicy = "immediate" | "human_review";
export type AccessibilityLevel = "none" | "basic" | "strict";
export interface PolicyContract {
    auth?: AuthPolicy;
    /**
     * "human_review" — every AI-generated patch is shown as a diff
     * and requires explicit approval before being written to disk.
     */
    publishing?: PublishPolicy;
    accessibility?: AccessibilityLevel;
    /** Absolute claims agents can never generate */
    forbiddenClaims?: string[];
}
export interface ComplianceContract {
    /**
     * Types of changes that always require human review —
     * even when publishing is set to "immediate".
     * e.g. "pricing changes", "legal claims", "testimonial edits"
     */
    requireHumanReviewFor?: string[];
}
export type IntegrationStatus = "none" | "optional" | "required";
export interface IntegrationsContract {
    analytics?: IntegrationStatus | string;
    emailProvider?: IntegrationStatus | string;
    payments?: IntegrationStatus | string;
    [key: string]: IntegrationStatus | string | undefined;
}
/**
 * Explicit pass/fail rules for `portal audit` and `portal preflight`.
 * Any gate set to true = hard fail if the rule is violated.
 */
export interface QualityGatesContract {
    maxBrokenLinks?: number;
    requireMetaTitle?: boolean;
    requireMetaDescription?: boolean;
    requireH1?: boolean;
    requirePrimaryCTA?: boolean;
    requireAltText?: boolean;
    /** Fail if copy still contains literal "Lorem ipsum" or "placeholder" text */
    forbidPlaceholderCopy?: boolean;
    /** Fail if {{…}} template tokens were never replaced */
    forbidUnreplacedTokens?: boolean;
}
export interface PageContract {
    route: string;
    purpose: string;
    audience?: string;
    primaryAction?: string;
    seoKeyword?: string;
}
export interface AppContract {
    /** Display name */
    name: string;
    /**
     * Contract schema version.
     * Portal uses this to parse and migrate contracts across versions.
     */
    version?: string;
    /** One-line description — used by agents for context and SEO generation */
    description?: string;
    /**
     * Primary target audiences at the app level.
     * Per-page audiences narrow this further.
     */
    primaryAudience?: string[];
    /**
     * Business goals — the north star for every agent audit.
     * Agents check that every change serves at least one of these.
     */
    goals: string[];
    brand?: BrandContract;
    /**
     * Named data sources. Agents can only source facts from here —
     * anything else is a potential hallucination.
     */
    data?: Record<string, string>;
    /** Conversion goals and measurable success events */
    conversion?: ConversionContract;
    /** SEO contract — replaces the old `seo: true` boolean in policies */
    seo?: SeoContract;
    policies?: PolicyContract;
    /** Compliance requirements — governs what always needs human sign-off */
    compliance?: ComplianceContract;
    /** Declared integrations — lets `portal doctor` warn about missing config */
    integrations?: IntegrationsContract;
    /**
     * Quality gates — explicit pass/fail rules used by `portal audit`
     * and `portal preflight`. Unset gates default to "warn" instead of "fail".
     */
    qualityGates?: QualityGatesContract;
    /** Per-route intent declarations */
    pages?: PageContract[];
}
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
export declare function defineApp(contract: AppContract): AppContract;
export interface AgentDefinition {
    name: string;
    model?: string;
    sentinel?: string;
    task: string;
    canPatch?: boolean;
    requiresApproval?: boolean;
}
export declare function defineAgent(def: AgentDefinition): AgentDefinition;
export declare function validateContract(raw: unknown): AppContract;
//# sourceMappingURL=index.d.ts.map