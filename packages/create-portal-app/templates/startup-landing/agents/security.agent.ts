import { defineAgent } from "@interchained/portal-contract";

/** Security auditor (read-only) — run with: portal agent run security */
export default defineAgent({
  name: "security",
  task:
    "Flag risky patterns: dangerouslySetInnerHTML, eval, hard-coded secrets or API " +
    "tokens, unvalidated external URLs, and external links using target=\"_blank\" " +
    "without rel=\"noopener noreferrer\". Report each finding with the file and the " +
    "reason. Do not edit any files.",
  canPatch: false,
});
