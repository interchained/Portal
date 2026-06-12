/**
 * Runner — fast, cheap first-pass AI model.
 * Does the actual generation/analysis work.
 * Output is reviewed by the Sentinel before being applied.
 */
import { type AiAssistConfig } from "./aiassist.js";
export interface RunnerConfig extends Partial<AiAssistConfig> {
    /** Override model with a fast/cheap option */
    model?: string;
}
export declare class Runner {
    private client;
    constructor(config?: RunnerConfig);
    run(task: string, context: string, systemPrompt?: string): Promise<string>;
    /** Generate a React page component */
    generateComponent(opts: {
        route: string;
        purpose: string;
        audience?: string;
        primaryAction?: string;
        brandVoice?: string;
        colors?: string[];
        existingImports?: string;
    }): Promise<string>;
    /** Analyze a file for audit issues */
    analyzeFile(opts: {
        filePath: string;
        content: string;
        checks: string[];
        contract: string;
    }): Promise<string>;
    /** Generate an improvement patch for an audit finding */
    generatePatch(opts: {
        filePath: string;
        originalContent: string;
        finding: string;
        contract: string;
    }): Promise<string>;
}
//# sourceMappingURL=runner.d.ts.map