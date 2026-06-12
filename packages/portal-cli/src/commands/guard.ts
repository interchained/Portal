/**
 * portal guard — safety check on pending patches before they touch the codebase.
 *
 * Usage:
 *   portal guard             (check all pending patches)
 *   portal guard --apply     (apply patches that pass all guard checks)
 */

import pc from "picocolors";
import { guardAllPending, PatchStore, applyPatch } from "@interchained/portal-agent";
import { banner, header, success, fail, warn, info, blank, icon } from "../utils/print.js";
import { loadContract } from "../utils/contract.js";

export interface GuardOptions {
  apply?: boolean;
}

export async function guardCommand(opts: GuardOptions = {}): Promise<void> {
  banner();

  const root     = process.cwd();
  const contract = await loadContract(root);
  const store    = new PatchStore(root);

  const patches = await store.list();
  const pending = patches.filter((p) => p.status === "pending");

  if (pending.length === 0) {
    success("No pending patches to guard.");
    blank();
    info("Patches are created by portal generate and portal improve.");
    return;
  }

  info(`Checking ${pending.length} pending patch${pending.length !== 1 ? "es" : ""}…`);
  blank();

  const results = await guardAllPending(patches, contract);

  let blocked = 0;
  let cleared = 0;

  for (const result of results) {
    const patch = patches.find((p) => p.id === result.patchId)!;

    header(`Patch: ${patch.file}`);
    console.log(pc.dim(`  Agent: ${patch.agent}  ·  Reason: ${patch.reason}`));
    blank();

    const blockViolations = result.violations.filter((v) => v.severity === "block");
    const warnViolations  = result.violations.filter((v) => v.severity === "warn");

    if (result.passed) {
      cleared++;
      success("Guard passed — no violations");

      for (const v of warnViolations) {
        warn(`  ${v.rule}: ${v.message}`);
      }

      if (opts.apply) {
        await store.update(patch.id, { status: "approved" });
        await applyPatch({ ...patch, status: "approved" }, root, store);
        success(`Applied: ${patch.file}`);
      } else {
        info(`Run ${pc.white("portal guard --apply")} to apply cleared patches.`);
      }
    } else {
      blocked++;
      fail(`Guard BLOCKED — ${blockViolations.length} violation${blockViolations.length !== 1 ? "s" : ""}`);

      for (const v of blockViolations) {
        console.log(`  ${icon.fail} ${pc.bold(v.rule)}: ${pc.red(v.message)}`);
        if (v.evidence) console.log(pc.dim(`       evidence: "${v.evidence}"`));
      }

      await store.update(patch.id, { status: "rejected" });
    }

    blank();
  }

  header("Guard Summary");
  if (cleared > 0) success(`${cleared} patch${cleared !== 1 ? "es" : ""} cleared`);
  if (blocked > 0) fail(`${blocked} patch${blocked !== 1 ? "es" : ""} blocked and rejected`);
  blank();
}
