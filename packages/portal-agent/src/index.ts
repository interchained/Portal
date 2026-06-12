export { AiAssistClient, AiAssistError } from "./aiassist.js";
export type { AiAssistConfig, Message, CompletionOptions } from "./aiassist.js";

export { Runner } from "./runner.js";
export type { RunnerConfig } from "./runner.js";

export { Sentinel } from "./sentinel.js";
export type { SentinelReview } from "./sentinel.js";

export { runAudit } from "./audit.js";
export type { AuditFinding, AuditReport, CheckCategory, CheckStatus } from "./audit.js";

export { generatePage, generateFromPrompt } from "./generate.js";
export type { GenerateOptions, GenerateResult } from "./generate.js";

export { improveFromFindings } from "./improve.js";
export type { ImproveOptions, ImproveResult } from "./improve.js";

export { guardPatch, guardAllPending } from "./guard.js";
export type { GuardViolation, GuardResult } from "./guard.js";

export {
  createPatch,
  applyPatch,
  inlineDiff,
  PatchStore,
} from "./patch.js";
export type { Patch, PatchStatus } from "./patch.js";
