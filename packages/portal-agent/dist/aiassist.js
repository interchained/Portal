/**
 * AiAssist.net HTTP client.
 * Uses an OpenAI-compatible chat completions API.
 * Set AIASSIST_API_KEY or VITE_AIAS_API_KEY in your environment.
 */
export class AiAssistError extends Error {
    statusCode;
    body;
    constructor(message, statusCode, body) {
        super(message);
        this.statusCode = statusCode;
        this.body = body;
        this.name = "AiAssistError";
    }
}
export class AiAssistClient {
    apiKey;
    baseUrl;
    model;
    timeoutMs;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl ?? "https://api.aiassist.net/v1").replace(/\/$/, "");
        this.model = config.model ?? "gpt-4o";
        this.timeoutMs = config.timeoutMs ?? 60_000;
    }
    /** Single-turn completion — convenience wrapper around chat() */
    async complete(prompt, systemPrompt, options) {
        const messages = [];
        if (systemPrompt)
            messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });
        return this.chat(messages, options);
    }
    /** Multi-turn chat completion */
    async chat(messages, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let response;
        try {
            response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: options?.temperature ?? 0.3,
                    max_tokens: options?.maxTokens ?? 4_096,
                    ...(options?.stop ? { stop: options.stop } : {}),
                }),
                signal: controller.signal,
            });
        }
        catch (err) {
            clearTimeout(timer);
            if (err.name === "AbortError") {
                throw new AiAssistError("Request timed out", 408);
            }
            throw new AiAssistError(`Network error: ${err.message}`, 0);
        }
        clearTimeout(timer);
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new AiAssistError(`AiAssist API error ${response.status}`, response.status, body);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            throw new AiAssistError("Unexpected response shape from AiAssist API", 500);
        }
        return content;
    }
    /** Resolve API key from environment if not explicitly provided */
    static fromEnv(overrides) {
        const apiKey = overrides?.apiKey ??
            process.env["AIASSIST_API_KEY"] ??
            process.env["VITE_AIAS_API_KEY"];
        if (!apiKey) {
            throw new Error("AiAssist API key not found. Set AIASSIST_API_KEY or VITE_AIAS_API_KEY.");
        }
        return new AiAssistClient({ apiKey, ...overrides });
    }
}
//# sourceMappingURL=aiassist.js.map