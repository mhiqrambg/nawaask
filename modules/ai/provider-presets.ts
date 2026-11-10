import type { AIProvider, ProviderProtocol } from "./types";

/** Built-in provider presets. baseUrl should include the /v1 prefix when the provider requires it. */
export const PROVIDER_PRESETS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o mini", contextLength: 128000, supportsStreaming: true, supportsVision: true },
      { id: "gpt-4o", name: "GPT-4o", contextLength: 128000, supportsStreaming: true, supportsVision: true },
      { id: "gpt-4.1-mini", name: "GPT-4.1 mini", contextLength: 1048576, supportsStreaming: true, supportsVision: true },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat", contextLength: 65536, supportsStreaming: true },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", contextLength: 65536, supportsStreaming: true },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "openai/gpt-4o-mini",
    models: [
      { id: "openai/gpt-4o-mini", name: "GPT-4o mini (OpenRouter)", supportsStreaming: true, supportsVision: true },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", supportsStreaming: true },
      { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", supportsStreaming: true },
    ],
  },
  {
    id: "qwen",
    name: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "qwen-plus",
    models: [
      { id: "qwen-plus", name: "Qwen Plus", supportsStreaming: true },
      { id: "qwen-turbo", name: "Qwen Turbo", supportsStreaming: true },
      { id: "qwen-max", name: "Qwen Max", supportsStreaming: true },
    ],
  },
  {
    id: "kimi",
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "moonshot-v1-8k",
    models: [
      { id: "moonshot-v1-8k", name: "Moonshot 8K", contextLength: 8192, supportsStreaming: true },
      { id: "moonshot-v1-32k", name: "Moonshot 32K", contextLength: 32768, supportsStreaming: true },
      { id: "moonshot-v1-128k", name: "Moonshot 128K", contextLength: 131072, supportsStreaming: true },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextLength: 131072, supportsStreaming: true },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", supportsStreaming: true },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKey: "",
    enabled: true,
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B", supportsStreaming: true },
      { id: "meta-llama/Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B", supportsStreaming: true },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    enabled: true,
    defaultModel: "llama3.1",
    models: [
      { id: "llama3.1", name: "Llama 3.1", contextLength: 128000, supportsStreaming: true },
      { id: "qwen2.5", name: "Qwen 2.5", supportsStreaming: true },
    ],
  },
];

/** Resolve wire protocol; stored providers without the field are OpenAI-compatible. */
export function protocolOf(provider: AIProvider): ProviderProtocol {
  return provider.protocol ?? "openai";
}

/**
 * Official presets (and copies made from them) vs user-created custom providers.
 * Stored providers without the flag fall back to preset-id matching.
 */
export function isCustomProvider(provider: AIProvider): boolean {
  if (typeof provider.custom === "boolean") return provider.custom;
  return !PROVIDER_PRESETS.some(
    (preset) => preset.id === provider.id || provider.id.startsWith(`${preset.id}-`),
  );
}
