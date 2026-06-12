/**
 * portal agent list  — list configured agents and their permissions
 * portal agent run   — run a specific agent task manually
 *
 * Agents are real defineAgent({ ... }) definitions loaded from agents/*.agent.ts.
 * Their declared permissions are enforced:
 *   - canPatch: false        → read-only; the agent analyzes and reports, never writes
 *   - canPatch: true         → may produce patches
 *   - requiresApproval: true → patches stay pending for `portal patch`
 *   - requiresApproval: false→ clean patches are applied automatically
 * When requiresApproval is unset it falls back to the contract's publishing policy,
 * defaulting to "requires approval" unless publishing is explicitly "immediate".
 */
export declare function agentListCommand(): Promise<void>;
export declare function agentRunCommand(name: string): Promise<void>;
//# sourceMappingURL=agent-cmd.d.ts.map