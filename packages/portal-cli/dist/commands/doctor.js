/**
 * portal doctor [--fix]
 *
 * Checks the project for health issues. With --fix, auto-repairs what it can:
 *   - Route file/directory conflicts (foo.page.tsx + foo/ → foo/index.page.tsx)
 *   - Missing routes/ directory
 *   - Unreplaced contract tokens
 */
import { access, readdir, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import pc from "picocolors";
import { banner, header, success, warn, fail, info, blank } from "../utils/print.js";
import { loadContract, findContractPath } from "../utils/contract.js";
async function exists(p) {
    try {
        await access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function listFiles(dir) {
    try {
        const entries = await readdir(dir, { recursive: true });
        return entries;
    }
    catch {
        return [];
    }
}
export async function doctorCommand(opts = {}) {
    banner();
    header(`Portal Doctor${opts.fix ? " (--fix mode)" : ""}`);
    const root = process.cwd();
    const checks = [];
    // ── Node version ──────────────────────────────────────────────────────────
    const nodeVer = process.version;
    const nodeMaj = parseInt(nodeVer.slice(1), 10);
    checks.push({
        label: `Node.js ${nodeVer}`,
        status: nodeMaj >= 18 ? "ok" : "fail",
        detail: nodeMaj < 18 ? "Portal requires Node.js 18 or newer" : undefined,
    });
    // ── Vite / portal config ──────────────────────────────────────────────────
    const hasViteConfig = (await exists(join(root, "vite.config.ts"))) ||
        (await exists(join(root, "vite.config.js"))) ||
        (await exists(join(root, "portal.config.ts")));
    checks.push({
        label: "vite.config.ts",
        status: hasViteConfig ? "ok" : "warn",
        detail: !hasViteConfig ? "No Vite config found — run: npm create @interchained/portal-app" : undefined,
    });
    // ── app.contract ──────────────────────────────────────────────────────────
    const contractPath = await findContractPath(root);
    checks.push({
        label: "app.contract",
        status: contractPath ? "ok" : "warn",
        detail: !contractPath ? "No contract found — run: portal contract init" : undefined,
    });
    // ── routes/ directory ─────────────────────────────────────────────────────
    const routesDir = join(root, "routes");
    const hasRoutes = await exists(routesDir);
    const allFiles = hasRoutes ? await listFiles(routesDir) : [];
    const pageFiles = allFiles.filter((e) => e.endsWith(".page.tsx") || e.endsWith(".page.jsx"));
    checks.push({
        label: `routes/ (${pageFiles.length} page${pageFiles.length !== 1 ? "s" : ""})`,
        status: hasRoutes && pageFiles.length > 0 ? "ok" : "warn",
        detail: !hasRoutes
            ? "No routes/ directory — run: portal contract init"
            : pageFiles.length === 0
                ? "routes/ exists but has no *.page.tsx files"
                : undefined,
    });
    // ── Route file / directory conflicts ─────────────────────────────────────
    // Pattern: routes/foo.page.tsx exists AND routes/foo/ directory exists
    // Fix: rename foo.page.tsx → foo/index.page.tsx
    if (hasRoutes) {
        for (const file of pageFiles) {
            const base = file.replace(/\.(page\.tsx|page\.jsx)$/, "");
            // Skip index files — those are already correct
            if (base.endsWith("/index") || base === "index")
                continue;
            const dirPath = join(routesDir, base);
            const filePath = join(routesDir, file);
            const dirExists = await exists(dirPath);
            if (dirExists) {
                const targetPath = join(dirPath, "index.page.tsx");
                checks.push({
                    label: `Route conflict: ${file} + ${base}/`,
                    status: "warn",
                    detail: `"${file}" shadows "${base}/" — should be "${base}/index.page.tsx"`,
                    fixLabel: `Rename → ${base}/index.page.tsx`,
                    fix: async () => {
                        await mkdir(dirname(targetPath), { recursive: true });
                        await rename(filePath, targetPath);
                    },
                });
            }
        }
    }
    // ── package.json ──────────────────────────────────────────────────────────
    const hasPkg = await exists(join(root, "package.json"));
    checks.push({
        label: "package.json",
        status: hasPkg ? "ok" : "fail",
        detail: !hasPkg ? "No package.json — are you in the right directory?" : undefined,
    });
    // ── AI API key ────────────────────────────────────────────────────────────
    const hasApiKey = !!process.env["AIASSIST_API_KEY"] || !!process.env["VITE_AIAS_API_KEY"];
    checks.push({
        label: "AIASSIST_API_KEY",
        status: hasApiKey ? "ok" : "warn",
        detail: !hasApiKey
            ? "Not set — portal audit --ai, portal improve, and portal generate require this"
            : undefined,
    });
    // ── Contract data files + tokens ──────────────────────────────────────────
    if (contractPath) {
        const contract = await loadContract(root);
        for (const [name, filePath] of Object.entries(contract.data ?? {})) {
            const fileExists = await exists(join(root, filePath));
            checks.push({
                label: `data.${name} (${filePath})`,
                status: fileExists ? "ok" : "warn",
                detail: !fileExists ? `Data file missing: ${filePath}` : undefined,
            });
        }
        if (contract.name.includes("{{")) {
            checks.push({
                label: "contract.name",
                status: "fail",
                detail: `Unreplaced token in contract name: "${contract.name}"`,
            });
        }
    }
    // ── Print results ─────────────────────────────────────────────────────────
    blank();
    let fixCount = 0;
    for (const check of checks) {
        if (check.status === "ok") {
            success(check.label);
        }
        else if (check.status === "warn") {
            warn(check.label);
            if (check.detail)
                console.log(pc.dim(`   ${check.detail}`));
            if (opts.fix && check.fix) {
                try {
                    await check.fix();
                    console.log(pc.green(`   ✓ Fixed: ${check.fixLabel ?? check.label}`));
                    fixCount++;
                }
                catch (err) {
                    console.log(pc.red(`   ✗ Fix failed: ${err.message}`));
                }
            }
            else if (check.fix) {
                console.log(pc.dim(`   → Run portal doctor --fix to auto-repair`));
            }
        }
        else {
            fail(check.label);
            if (check.detail)
                console.log(pc.red(`   ${check.detail}`));
        }
    }
    blank();
    if (opts.fix && fixCount > 0) {
        info(`Auto-fixed ${fixCount} issue${fixCount !== 1 ? "s" : ""}`);
        blank();
    }
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;
    if (failCount > 0) {
        fail(`${failCount} critical issue${failCount !== 1 ? "s" : ""} — fix before proceeding`);
        process.exit(1);
    }
    else if (warnCount > 0 && !opts.fix) {
        warn(`${warnCount} warning${warnCount !== 1 ? "s" : ""} — run portal doctor --fix to auto-repair`);
    }
    else {
        success("All checks passed — project looks healthy");
    }
    blank();
}
//# sourceMappingURL=doctor.js.map