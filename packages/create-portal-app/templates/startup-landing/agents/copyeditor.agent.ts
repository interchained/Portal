import { defineAgent } from "@interchained/portal-contract";

/** Copy editor — run with: portal agent run copyeditor */
export default defineAgent({
  name: "copyeditor",
  task:
    "Proofread all visible copy for spelling, grammar, and punctuation, and tighten " +
    "wordy or redundant sentences without changing their meaning. Preserve every " +
    "component, import, prop, and piece of markup exactly — only edit text content.",
  canPatch: true,
  requiresApproval: true,
});
