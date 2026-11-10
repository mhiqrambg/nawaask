export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Selected page text this user message was asked about. */
  context?: string;
  /** Screenshot captured from the active tab when the question was sent. */
  screenshot?: ScreenshotAttachment;
  createdAt: number;
  error?: string;
  model?: string;
}

/** JPEG screenshot of the visible tab, downscaled for vision requests. */
export interface ScreenshotAttachment {
  /** `data:image/jpeg;base64,...` */
  dataUrl: string;
  width: number;
  height: number;
  title: string;
  url: string;
}

export interface AIModel {
  id: string;
  name: string;
  contextLength?: number;
  supportsStreaming: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

export type ProviderProtocol = "openai" | "anthropic";

/** OpenAI-compatible request shape. Missing = chat-completions. */
export type ProviderApi = "chat-completions" | "responses";

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: AIModel[];
  defaultModel?: string;
  /** Wire protocol. Missing = "openai" (existing stored data). */
  protocol?: ProviderProtocol;
  /** Request shape for OpenAI-compatible providers. Missing = chat-completions. */
  api?: ProviderApi;
  /** True for user-created providers. */
  custom?: boolean;
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatCompletionMessage {
  role: ChatMessage["role"];
  content: string | ChatContentPart[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  temperature?: number;
}

export interface ChatCompletionChunkChoiceDelta {
  role?: ChatMessage["role"];
  content?: string | null;
}

export interface ChatCompletionChunk {
  choices?: {
    index?: number;
    delta?: ChatCompletionChunkChoiceDelta;
    message?: ChatCompletionChunkChoiceDelta;
    finish_reason?: string | null;
  }[];
  error?: { message?: string; type?: string };
}

export interface ChatCompletionResponse {
  choices?: {
    index?: number;
    message?: { role?: ChatMessage["role"]; content?: string | null };
    delta?: ChatCompletionChunkChoiceDelta;
  }[];
  error?: { message?: string; type?: string };
}

export interface ModelListResponse {
  data?: { id: string; owned_by?: string }[];
}
