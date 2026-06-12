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

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class AiAssistError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "AiAssistError";
  }
}

export interface AiAssistConfig {
  apiKey: string;
  /** Base URL for the AiAssist API. Defaults to https://api.aiassist.net/v1 */
  baseUrl?: string;
  /** Model identifier */
  model?: string;
  /** Provider to route through — sent as X-AiAssist-Provider header. Defaults to "anthropic" */
  provider?: string;
  /** Request timeout in ms. Defaults to 60 000 */
  timeoutMs?: number;
}

export class AiAssistClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  private readonly provider: string;

  constructor(config: AiAssistConfig) {
    this.apiKey    = config.apiKey;
    this.baseUrl   = (config.baseUrl ?? "https://api.aiassist.net/v1").replace(/\/$/, "");
    this.model     = config.model    ?? "claude-haiku-4-5-20251001";
    this.provider  = config.provider ?? "anthropic";
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  /** Single-turn completion — convenience wrapper around chat() */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: CompletionOptions
  ): Promise<string> {
    const messages: Message[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    return this.chat(messages, options);
  }

  /** Multi-turn chat completion */
  async chat(messages: Message[], options?: CompletionOptions): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "X-AiAssist-Provider": this.provider,
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
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        throw new AiAssistError("Request timed out", 408);
      }
      throw new AiAssistError(`Network error: ${(err as Error).message}`, 0);
    }
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiAssistError(
        `AiAssist API error ${response.status}`,
        response.status,
        body
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AiAssistError("Unexpected response shape from AiAssist API", 500);
    }
    return content;
  }

  /** Resolve API key from environment if not explicitly provided */
  static fromEnv(overrides?: Partial<AiAssistConfig>): AiAssistClient {
    const apiKey =
      overrides?.apiKey ??
      process.env["AIASSIST_API_KEY"] ??
      process.env["VITE_AIAS_API_KEY"];

    if (!apiKey) {
      throw new Error(
        "AiAssist API key not found. Set AIASSIST_API_KEY or VITE_AIAS_API_KEY."
      );
    }
    return new AiAssistClient({ apiKey, ...overrides });
  }
}
