/**
 * AiAssist.net HTTP client.
 * Uses an OpenAI-compatible chat completions API.
 * Set AIASSIST_API_KEY or VITE_AIAS_API_KEY in your environment.
 */
export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface CompletionOptions {
    temperature?: number;
    maxTokens?: number;
    /** Stop sequences */
    stop?: string[];
}
export declare class AiAssistError extends Error {
    readonly statusCode: number;
    readonly body?: string | undefined;
    constructor(message: string, statusCode: number, body?: string | undefined);
}
export interface AiAssistConfig {
    apiKey: string;
    /** Base URL for the AiAssist API. Defaults to https://api.aiassist.net/v1 */
    baseUrl?: string;
    /** Model identifier */
    model?: string;
    /** Request timeout in ms. Defaults to 60 000 */
    timeoutMs?: number;
}
export declare class AiAssistClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    private readonly timeoutMs;
    constructor(config: AiAssistConfig);
    /** Single-turn completion — convenience wrapper around chat() */
    complete(prompt: string, systemPrompt?: string, options?: CompletionOptions): Promise<string>;
    /** Multi-turn chat completion */
    chat(messages: Message[], options?: CompletionOptions): Promise<string>;
    /** Resolve API key from environment if not explicitly provided */
    static fromEnv(overrides?: Partial<AiAssistConfig>): AiAssistClient;
}
//# sourceMappingURL=aiassist.d.ts.map