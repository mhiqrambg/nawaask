import type {
  AIProvider,
  ChatCompletionMessage,
  ChatCompletionResponse,
  ModelListResponse,
} from "./types";
import { NawaError } from "@/utils/errors";
import { readJson, streamChatCompletion } from "./streaming";
import { DEFAULT_TEMPERATURE } from "@/utils/constants";

function apiErrorMessage(status: number, body: unknown, fallback: string): string {
  let text: unknown;
  if (body && typeof body === "object" && "error" in body) {
    text = (body as { error?: unknown }).error;
  }
  if (text && typeof text === "object" && "message" in text) {
    const m = (text as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  if (typeof text === "string") return text;
  return fallback;
}

export class AIClient {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.provider.apiKey}`,
    };
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const url = `${this.provider.baseUrl.replace(/\/$/, "")}/models`;
    let res: Response;
    try {
      res = await fetch(url, { headers: this.headers(), signal });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new NawaError("network", `Cannot reach ${this.provider.baseUrl}`);
    }
    if (!res.ok) {
      const body = await readJson<ModelListResponse>(res).catch(() => ({}));
      throw new NawaError(
        "http",
        apiErrorMessage(res.status, body, `Failed to load models (${res.status})`),
        res.status,
      );
    }
    const data = await readJson<ModelListResponse>(res);
    return (data.data ?? []).map((m) => m.id).filter(Boolean);
  }

  /**
   * Stream a chat completion. Calls onDelta with accumulated text deltas.
   * Returns the full text when streaming finishes.
   */
  async chatStream(
    messages: ChatCompletionMessage[],
    opts: { signal?: AbortSignal; temperature?: number; model: string },
    onDelta: (full: string) => void,
  ): Promise<string> {
    const url = `${this.provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        signal: opts.signal,
        body: JSON.stringify({
          model: opts.model,
          messages,
          stream: true,
          temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        }),
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new NawaError("network", `Cannot reach ${this.provider.baseUrl}`);
    }
    if (!res.ok) {
      const body = await readJson<ChatCompletionResponse>(res).catch(() => ({}));
      const msg = apiErrorMessage(
        res.status,
        body,
        `Request failed (${res.status})`,
      );
      if (res.status === 401) {
        throw new NawaError("unauthorized", "Invalid API key. Check provider configuration.", 401);
      }
      if (res.status === 404) {
        throw new NawaError("model_not_found", `Model not found: ${opts.model}`, 404);
      }
      if (res.status === 429) {
        throw new NawaError("rate_limited", "Rate limit exceeded. Try again shortly.", 429);
      }
      throw new NawaError("http", msg, res.status);
    }

    let full = "";
    await streamChatCompletion(res, (delta) => {
      full += delta;
      onDelta(full);
    });
    return full;
  }
}
