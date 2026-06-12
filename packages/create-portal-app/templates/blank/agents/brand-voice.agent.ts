import { defineAgent } from "@interchained/portal-contract";

/** Brand voice — run with: portal agent run brand-voice */
export default defineAgent({
  name: "brand-voice",
  task:
    "Rewrite copy to match the brand voice defined in the app contract and remove any " +
    "forbidden phrases or unsupported claims listed there. Keep all markup, components, " +
    "and structure intact — adjust wording and tone only.",
  canPatch: true,
  requiresApproval: true,
});
