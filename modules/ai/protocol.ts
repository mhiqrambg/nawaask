import type { AIProvider, ProviderProtocol } from "./types";

/** Wire protocol for a provider; missing = OpenAI-compatible. */
export function protocolOf(provider: AIProvider): ProviderProtocol {
  return provider.protocol ?? "openai";
}
