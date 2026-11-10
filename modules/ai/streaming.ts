import { NawaError } from "@/utils/errors";

export async function streamChatCompletion(
  response: Response,
  onDelta: (chunk: string) => void,
): Promise<void> {
  if (!response.body) {
    const text = await response.text().catch(() => "");
    if (text) onDelta(text);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      const line = raw.trim();
      if (!line || line.startsWith(":")) {
        idx = buffer.indexOf("\n");
        continue;
      }
      if (!line.startsWith("data:")) {
        idx = buffer.indexOf("\n");
        continue;
      }
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        done = true;
        break;
      }
      if (payload) {
        try {
          const json: unknown = JSON.parse(payload);
          if (json && typeof json === "object" && "choices" in json) {
            const choices = (json as { choices?: unknown }).choices;
            if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
              const choice = choices[0] as { delta?: unknown };
              if (choice.delta && typeof choice.delta === "object" && "content" in choice.delta) {
                const content = (choice.delta as { content?: unknown }).content;
                if (typeof content === "string" && content) onDelta(content);
              }
            }
          }
        } catch {
          // ignore malformed keep-alive chunks
        }
      }
      idx = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) {
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== "[DONE]") {
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const content = json.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // ignore
        }
      }
    }
  }
}

/**
 * Stream an Anthropic Messages API response (SSE `event:` + `data:` lines).
 * Accumulates `content_block_delta` text; surfaces `error` events as failures.
 */
export async function streamAnthropicMessages(
  response: Response,
  onDelta: (chunk: string) => void,
): Promise<void> {
  if (!response.body) {
    const text = await response.text().catch(() => "");
    if (text) onDelta(text);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";

  const handleData = (payload: string): void => {
    if (!payload) return;
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }
    if (!json || typeof json !== "object") return;
    if (event === "error" && "error" in json) {
      const detail: unknown = json.error;
      const message =
        detail && typeof detail === "object" && "message" in detail &&
          typeof detail.message === "string"
          ? detail.message
          : "Anthropic request failed";
      throw new NawaError("provider_error", message, response.status);
    }
    if (event === "content_block_delta" && "delta" in json) {
      const delta: unknown = json.delta;
      if (
        delta && typeof delta === "object" && "text" in delta &&
        typeof delta.text === "string" && delta.text
      ) {
        onDelta(delta.text);
      }
    }
  };

  for (;;) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        handleData(line.slice(5).trim());
        if (event === "message_stop") return;
      }
      idx = buffer.indexOf("\n");
    }
  }
}

/**
 * Stream an OpenAI Responses API event stream (`POST /responses`).
 * Accumulates `response.output_text.delta` text; surfaces failure events.
 */
export async function streamResponsesApi(
  response: Response,
  onDelta: (chunk: string) => void,
): Promise<void> {
  if (!response.body) {
    const text = await response.text().catch(() => "");
    if (text) onDelta(text);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";

  const handleData = (payload: string): void => {
    if (!payload || payload === "[DONE]") return;
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }
    if (!json || typeof json !== "object") return;
    if ((event === "response.failed" || event === "error") && "error" in json) {
      throw new NawaError("provider_error", responseErrorMessage(json.error));
    }
    if (event === "response.output_text.delta" && "delta" in json) {
      const delta: unknown = json.delta;
      if (typeof delta === "string" && delta) onDelta(delta);
    }
  };

  for (;;) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        handleData(line.slice(5).trim());
        if (event === "response.completed") return;
      }
      idx = buffer.indexOf("\n");
    }
  }
}

function responseErrorMessage(raw: unknown): string {
  if (raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string") {
    return raw.message;
  }
  return "Request failed";
}

export async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new NawaError("invalid_json", "Provider returned invalid JSON", response.status);
  }
}
