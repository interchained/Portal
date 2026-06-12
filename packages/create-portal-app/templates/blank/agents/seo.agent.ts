import { defineAgent } from "@interchained/portal-contract";

/**
 * An agent is a standing task Portal can run against your pages.
 * Run it with:  portal agent run seo
 * List all:     portal agent list
 *
 * Permissions are enforced:
 *   canPatch: false        → reviews and reports only, never edits files
 *   canPatch: true         → may produce patches
 *   requiresApproval: true → patches wait in `portal patch` for your approval
 *   requiresApproval: false→ clean patches are applied automatically
 */
export default defineAgent({
  name: "seo",
  task: "Ensure every page has a unique <title>, a meta description, and exactly one H1.",
  canPatch: true,
  requiresApproval: true,
});
