import { defineAgent } from "@interchained/portal-contract";

/** Accessibility — run with: portal agent run a11y */
export default defineAgent({
  name: "a11y",
  task:
    "Audit and fix accessibility issues: add descriptive alt text to images, " +
    "associate <label> elements with their inputs, ensure interactive elements " +
    "are keyboard-reachable with visible focus states, and add ARIA roles only " +
    "where native semantics are missing. Never change visible copy or layout.",
  canPatch: true,
  requiresApproval: true,
});
