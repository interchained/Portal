/**
 * portal lint — ESLint + TypeScript checks + contract schema validation.
 */
import { access } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { banner, success, fail, step, warn, blank } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";
import { validateContract } from "@interchained/portal-contract";
async function exists(p) {
    try {
        await access(p);
        return true;
    }
    catch {
        return false;
    }
}
export async function lintCommand() {
    banner();
    const root = process.cwd();
    let failed = false;
    // 1. ESLint
    const hasEslint = await exists(join(root, "node_modules", "eslint"));
    if (hasEslint) {
        step("Running ESLint…");
        try {
            await execa("npx", ["eslint", ".", "--ext", ".ts,.tsx", "--max-warnings", "0"], {
                stdio: "inherit",
                cwd: root,
                env: { ...process.env, FORCE_COLOR: "1" },
            });
            success("ESLint passed");
        }
        catch {
            fail("ESLint found issues");
            failed = true;
        }
    }
    else {
        warn("ESLint not installed — skipping");
    }
    blank();
    // 2. TypeScript
    step("Running tsc --noEmit…");
    try {
        await execa("npx", ["tsc", "--noEmit"], {
            stdio: "inherit",
            cwd: root,
        });
        success("TypeScript passed");
    }
    catch {
        fail("TypeScript errors found");
        failed = true;
    }
    blank();
    // 3. Contract validation
    step("Validating app contract…");
    try {
        const contract = await loadContract(root);
        validateContract(contract);
        // Extra checks
        const tokens = JSON.stringify(contract).match(/\{\{[A-Z_]+\}\}/g);
        if (tokens) {
            fail(`Unreplaced template tokens in contract: ${tokens.join(", ")}`);
            failed = true;
        }
        else {
            success("Contract valid");
        }
    }
    catch (err) {
        fail(`Contract invalid: ${err.message}`);
        failed = true;
    }
    blank();
    if (failed) {
        fail("Lint failed — fix the issues above before committing");
        process.exit(1);
    }
    else {
        success("All lint checks passed");
        blank();
    }
}
//# sourceMappingURL=lint.js.map