/**
 * Page / component generation.
 *
 * Flow when Sentinel is present:
 *   Runner generates → Sentinel.reviewAndApply() → applied or blocked
 *
 * Flow without Sentinel (--no-sentinel or API key absent):
 *   Runner generates → patch saved as "pending" → human approves via CLI
 */
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { createPatch, PatchStore } from "./patch.js";
/**
 * Generate a new page component from a PageContract.
 */
export async function generatePage(page, opts, store) {
    const { runner, sentinel, contract } = opts;
    const fileName = await routeToFileName(page.route, join(opts.projectRoot, "routes"));
    const filePath = join(opts.projectRoot, "routes", fileName);
    let original = "";
    try {
        original = await readFile(filePath, "utf-8");
    }
    catch {
        // New file
    }
    const proposed = await runner.generateComponent({
        route: page.route,
        purpose: page.purpose,
        audience: page.audience,
        primaryAction: page.primaryAction,
        brandVoice: contract.brand?.voice,
        colors: contract.brand?.colors,
    });
    const requiresApproval = opts.requiresApproval ?? contract.policies?.publishing === "human_review";
    const patch = createPatch({
        agent: "portal-generate",
        file: join("routes", fileName),
        original,
        proposed,
        reason: `Generate page: ${page.purpose}`,
        requiresApproval,
    });
    await store.save(patch);
    // ── Sentinel is the gate + applier ─────────────────────────────────────────
    if (sentinel) {
        const result = await sentinel.reviewAndApply({
            patch,
            projectRoot: opts.projectRoot,
            store,
            contract,
            agentTask: `Generate page for route "${page.route}": ${page.purpose}`,
        });
        return {
            patch,
            sentinelReview: result.review,
            sentinelApplied: result.applied,
            sentinelFix: result.fix
                ? { summary: result.fix.summary, changes: result.fix.changes }
                : undefined,
        };
    }
    // ── No sentinel — patch stays "pending", human decides ────────────────────
    return { patch, sentinelApplied: false };
}
/**
 * Generate a page from a freeform description.
 * `portal generate page "Father's Day promo"` style.
 */
export async function generateFromPrompt(prompt, opts, store) {
    const resolvedStore = store ?? new PatchStore(opts.projectRoot);
    const route = opts.route ?? promptToRoute(prompt);
    const page = {
        route,
        purpose: prompt,
        audience: undefined,
        primaryAction: undefined,
    };
    return generatePage(page, opts, resolvedStore);
}
// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Convert a route like /docs to a file path like docs/index.page.tsx.
 *
 * Rule: if a routes/<segment>/ directory already exists, use the
 * index convention (foo/index.page.tsx) so the file sits alongside its
 * siblings instead of shadowing the directory. Otherwise use the flat
 * convention (foo.page.tsx). Root / always maps to index.page.tsx.
 */
async function routeToFileName(route, routesDir) {
    const clean = route.replace(/^\//, "").replace(/\/$/, "") || "index";
    if (clean === "index")
        return "index.page.tsx";
    // Check if a directory already exists for this segment
    const dirPath = join(routesDir, clean);
    let dirExists = false;
    try {
        await access(dirPath);
        dirExists = true;
    }
    catch { /* */ }
    return dirExists ? `${clean}/index.page.tsx` : `${clean}.page.tsx`;
}
function promptToRoute(prompt) {
    return ("/" +
        prompt
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .slice(0, 48));
}
//# sourceMappingURL=generate.js.map