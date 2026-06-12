import { defineAgent } from "@interchained/portal-contract";

/** Performance auditor (read-only) — run with: portal agent run performance */
export default defineAgent({
  name: "performance",
  task:
    "Review pages for performance risks: large inline data literals that belong in " +
    "data files, unoptimized or unsized images, render-blocking work inside " +
    "components, and unnecessary client-side state. Report each finding with the " +
    "file and a concrete suggestion. Do not edit any files.",
  canPatch: false,
});
