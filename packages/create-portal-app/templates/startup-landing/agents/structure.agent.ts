import { defineAgent } from "@interchained/portal-contract";

/** Semantic structure — run with: portal agent run structure */
export default defineAgent({
  name: "structure",
  task:
    "Enforce semantic structure on each page: exactly one H1, a logical heading order " +
    "with no skipped levels, landmark elements (header, nav, main, footer) where " +
    "appropriate, and real lists for grouped items instead of stacked divs. Preserve " +
    "all visible copy.",
  canPatch: true,
  requiresApproval: true,
});
