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

export async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new NawaError("invalid_json", "Provider returned invalid JSON", response.status);
  }
}
