/**
 * Load agent definitions from a Portal project's agents/ directory.
 *
 * Mirrors the contract loader's philosophy (see utils/contract.ts): we extract
 * the `defineAgent({ ... })` object literal and evaluate just that object rather
 * than executing the whole module. AgentDefinition is a flat object, so this is
 * safe and predictable.
 */
import type { AgentDefinition } from "@interchained/portal-contract";
export declare function agentsDirExists(agentsDir: string): Promise<boolean>;
/** List the *.agent.ts / *.agent.js files in agents/. */
export declare function findAgentFiles(agentsDir: string): Promise<string[]>;
/**
 * Resolve a user-supplied name to an agent file.
 * Prefers an exact `<name>.agent.{ts,js}` match, then a substring match.
 */
export declare function matchAgentFile(files: string[], name: string): string | null;
/** Load and parse a single agent definition file. */
export declare function loadAgent(filePath: string): Promise<AgentDefinition>;
//# sourceMappingURL=agents.d.ts.map