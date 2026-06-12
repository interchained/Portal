import { defineAgent } from "@interchained/portal-contract";

/** Conversion — run with: portal agent run conversion */
export default defineAgent({
  name: "conversion",
  task:
    "Ensure each page has exactly one clear primary call-to-action that matches the " +
    "app's goals, with action-oriented button copy and a logical placement near the " +
    "top of the page. Strengthen weak or missing CTAs without inventing features or " +
    "making unsupported claims.",
  canPatch: true,
  requiresApproval: true,
});
