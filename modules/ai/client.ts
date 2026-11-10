import type {
  AIProvider,
  ChatCompletionMessage,
  ChatCompletionResponse,
  ChatContentPart,
  ModelListResponse,
} from "./types";
import { NawaError } from "@/utils/errors";
import { readJson, streamAnthropicMessages, streamChatCompletion, streamResponsesApi } from "./streaming";
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

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

function toAnthropicContent(
  content: string | ChatContentPart[],
): string | AnthropicContentBlock[] {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const url = part.image_url.url;
    const match = /^data:([^;,]+);base64,/.exec(url);
    const mediaType = match?.[1];
    if (!match || !mediaType) {
      throw new NawaError("invalid_image", "Screenshot is not a base64 data URL.");
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: url.slice(match[0].length),
      },
    };
  });
}

type ResponsesContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

function toResponsesContent(
  content: string | ChatContentPart[],
): ResponsesContentPart[] {
  if (typeof content === "string") return [{ type: "input_text", text: content }];
  return content.map((part) =>
    part.type === "text"
      ? { type: "input_text", text: part.text }
      : { type: "input_image", image_url: part.image_url.url },
  );
}

export class AIClient {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  private get protocol(): "openai" | "anthropic" {
    return this.provider.protocol ?? "openai";
  }

  private base(): string {
    return this.provider.baseUrl.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    if (this.protocol === "anthropic") {
      return {
        "Content-Type": "application/json",
        "x-api-key": this.provider.apiKey,
        "anthropic-version": "2023-06-01",
      };
    }
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
    if (this.protocol === "anthropic") {
      return this.chatStreamAnthropic(messages, opts, onDelta);
    }
    if ((this.provider.api ?? "chat-completions") === "responses") {
      return this.chatStreamResponses(messages, opts, onDelta);
    }
    const url = `${this.base()}/chat/completions`;
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
    await this.throwIfError(res, opts.model);

    let full = "";
    await streamChatCompletion(res, (delta) => {
      full += delta;
      onDelta(full);
    });
    return full;
  }

  private async throwIfError(res: Response, model: string): Promise<void> {
    if (res.ok) return;
    const body = await readJson<ChatCompletionResponse>(res).catch(() => ({}));
    const msg = apiErrorMessage(res.status, body, `Request failed (${res.status})`);
    if (res.status === 401) {
      throw new NawaError("unauthorized", "Invalid API key. Check provider configuration.", 401);
    }
    if (res.status === 404) {
      throw new NawaError("model_not_found", `Model not found: ${model}`, 404);
    }
    if (res.status === 429) {
      throw new NawaError("rate_limited", "Rate limit exceeded. Try again shortly.", 429);
    }
    throw new NawaError("http", msg, res.status);
  }

  /**
   * Anthropic Messages API. `system` is sent separately and `max_tokens`
   * is required; only user/assistant turns go in `messages`.
   */
  private async chatStreamAnthropic(
    messages: ChatCompletionMessage[],
    opts: { signal?: AbortSignal; temperature?: number; model: string },
    onDelta: (full: string) => void,
  ): Promise<string> {
    const systemContent = messages.find((m) => m.role === "system")?.content;
    const system = typeof systemContent === "string" ? systemContent : undefined;
    const turns = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }));
    let res: Response;
    try {
      res = await fetch(`${this.base()}/messages`, {
        method: "POST",
        headers: this.headers(),
        signal: opts.signal,
        body: JSON.stringify({
          model: opts.model,
          max_tokens: 4096,
          ...(system ? { system } : {}),
          messages: turns,
          stream: true,
          temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        }),
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new NawaError("network", `Cannot reach ${this.provider.baseUrl}`);
    }
    await this.throwIfError(res, opts.model);

    let full = "";
    await streamAnthropicMessages(res, (delta) => {
      full += delta;
      onDelta(full);
    });
    return full;
  }

  /**
   * OpenAI Responses API. Conversational turns go in `input` as message
   * items; text arrives as `response.output_text.delta` events.
   */
  private async chatStreamResponses(
    messages: ChatCompletionMessage[],
    opts: { signal?: AbortSignal; temperature?: number; model: string },
    onDelta: (full: string) => void,
  ): Promise<string> {
    const input = messages.map((m) => ({
      role: m.role,
      content: toResponsesContent(m.content),
    }));
    let res: Response;
    try {
      res = await fetch(`${this.base()}/responses`, {
        method: "POST",
        headers: this.headers(),
        signal: opts.signal,
        body: JSON.stringify({
          model: opts.model,
          input,
          stream: true,
          temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        }),
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new NawaError("network", `Cannot reach ${this.provider.baseUrl}`);
    }
    await this.throwIfError(res, opts.model);

    let full = "";
    await streamResponsesApi(res, (delta) => {
      full += delta;
      onDelta(full);
    });
    return full;
  }
}
