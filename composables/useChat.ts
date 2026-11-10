import { signal, computed } from "@preact/signals";
import type { ChatMessage, ChatCompletionMessage } from "@/modules/ai/types";
import { AIClient } from "@/modules/ai/client";
import type { Conversation, ConversationMeta } from "@/modules/storage/conversations";
import {
  newConversation,
  putConversation,
  listConversations,
  deleteConversation,
  getConversation,
  deriveTitle,
} from "@/modules/storage/conversations";
import { loadSettings } from "@/modules/storage/settings";
import { loadProviders } from "@/modules/storage/providers";
import type { PageContextResult, SelectionContext } from "@/modules/browser/messaging";
import { SELECTION_STORAGE_KEY } from "@/modules/browser/messaging";
import { buildSystemPrompt } from "@/modules/prompts/system-prompts";

export const messages = signal<ChatMessage[]>([]);
export const streaming = signal(false);
export const errorMessage = signal<string | null>(null);
export const pageContext = signal<PageContextResult | null>(null);
export const conversationId = signal<string | null>(null);
export const currentModel = signal<{ providerId: string; modelId: string } | null>(null);
export const historyMeta = signal<ConversationMeta[]>([]);
export const selectedText = signal<SelectionContext | null>(null);

let abortController: AbortController | null = null;

export const canSend = computed(
  () => !streaming.value && Boolean(currentModel.value),
);

export async function fetchPageContext(): Promise<PageContextResult | null> {
  try {
    // The side panel is its own window without tabs: target the page window.
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const activeTab = tabs[0] ?? (await chrome.tabs.query({ active: true }))[0];
    if (!activeTab?.id) return null;
    const response = await chrome.tabs.sendMessage(activeTab.id, {
      type: "GET_PAGE_CONTEXT",
    });
    return response?.payload ?? null;
  } catch {
    return null;
  }
}

export async function refreshHistory(): Promise<void> {
  try {
    historyMeta.value = await listConversations();
  } catch {
    historyMeta.value = [];
  }
}

export async function startNewChat(): Promise<void> {
  stopGeneration();
  messages.value = [];
  errorMessage.value = null;
  pageContext.value = null;
  selectedText.value = null;
  conversationId.value = null;
}

export async function loadConversation(id: string): Promise<void> {
  stopGeneration();
  const conv = await getConversation(id);
  if (!conv) return;
  messages.value = [...conv.messages];
  conversationId.value = conv.id;
  currentModel.value = { providerId: conv.providerId, modelId: conv.modelId };
  selectedText.value = null;
  pageContext.value = null;
}

export async function deleteConv(id: string): Promise<void> {
  await deleteConversation(id);
  await refreshHistory();
  if (conversationId.value === id) await startNewChat();
}

export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  const conv = await getConversation(id);
  if (!conv) return;
  await putConversation({ ...conv, pinned });
  await refreshHistory();
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const conv = await getConversation(id);
  if (!conv) return;
  await putConversation({ ...conv, title: title.trim() || conv.title });
  await refreshHistory();
}

export function stopGeneration(): void {
  abortController?.abort();
  abortController = null;
  streaming.value = false;
}

function buildSelectionRequest(context: string, question: string): string {
  return `Context:\n${context}\n\nUser Question:\n${question}\n\nInstruction:\nAnswer the user's question based on the selected text. Provide additional helpful context when necessary.`;
}

function toCompletionMessages(
  history: ChatMessage[],
  system: string,
): ChatCompletionMessage[] {
  const prior = history.filter((m) => m.role !== "system" && !m.error);
  return [
    { role: "system", content: system },
    ...prior.map((m) => ({
      role: m.role,
      content: m.role === "user" && m.context ? buildSelectionRequest(m.context, m.content) : m.content,
    })),
  ];
}

async function persistInto(convId: string, history: ChatMessage[]): Promise<void> {
  const existing = await getConversation(convId);
  const now = Date.now();
  const conv: Conversation = existing
    ? {
        ...existing,
        messages: history,
        updatedAt: now,
        title: existing.pinned ? existing.title : deriveTitle(history),
        pageContext: pageContext.value?.mainText ?? existing.pageContext,
      }
    : {
        ...newConversation(
          currentModel.value?.providerId ?? "",
          currentModel.value?.modelId ?? "",
        ),
        id: convId,
        title: deriveTitle(history),
        createdAt: now,
        updatedAt: now,
        messages: history,
        pageContext: pageContext.value?.mainText,
      };
  await putConversation(conv);
  await refreshHistory();
}

async function generate(history: ChatMessage[]): Promise<void> {
  const model = currentModel.value;
  if (!model) {
    errorMessage.value = "No provider configured. Open Settings to add one.";
    return;
  }
  const providers = await loadProviders();
  const provider = providers.find((p) => p.id === model.providerId);
  if (!provider) {
    errorMessage.value = "Provider not found.";
    return;
  }
  if (!provider.apiKey && !provider.baseUrl.includes("localhost")) {
    errorMessage.value = `${provider.name} has no API key set.`;
    return;
  }

  const settings = await loadSettings();
  const includePage = settings.includePageContext && Boolean(pageContext.value?.mainText);
  const lastUser = [...history].reverse().find((m) => m.role === "user" && !m.error);
  const system = buildSystemPrompt({
    hasPageContext: includePage,
    hasSelection: Boolean(lastUser?.context),
    language: settings.language,
  });
  const convMessages = toCompletionMessages(history, system);
  if (includePage && pageContext.value) {
    convMessages.push({
      role: "user",
      content: `[Webpage context]\nTitle: ${pageContext.value.title}\nURL: ${pageContext.value.url}\n\n${pageContext.value.mainText}`,
    });
  }

  const assistantId = crypto.randomUUID();
  const assistantMsg: ChatMessage = {
    id: assistantId,
    role: "assistant",
    content: "",
    createdAt: Date.now(),
    model: model.modelId,
  };
  messages.value = [...history, assistantMsg];
  streaming.value = true;
  errorMessage.value = null;
  abortController = new AbortController();

  const client = new AIClient(provider);
  try {
    await client.chatStream(
      convMessages,
      { signal: abortController.signal, model: model.modelId },
      (full) => {
        const current = messages.value;
        const next = [...current];
        next[next.length - 1] = { ...assistantMsg, content: full };
        messages.value = next;
      },
    );
  } catch (err) {
    const message = (err as Error)?.message ?? "Generation failed";
    if ((err as Error)?.name === "AbortError") {
      errorMessage.value = null;
    } else {
      errorMessage.value = message;
      const current = messages.value;
      const next = [...current];
      next[next.length - 1] = { ...assistantMsg, error: message };
      messages.value = next;
    }
  } finally {
    streaming.value = false;
    abortController = null;
  }

  let convId = conversationId.value;
  if (!convId) {
    convId = crypto.randomUUID();
    conversationId.value = convId;
  }
  await persistInto(convId, messages.value);
}

export async function sendMessage(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || streaming.value) return;
  const context = selectedText.value?.text;
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: trimmed,
    ...(context ? { context } : {}),
    createdAt: Date.now(),
  };
  const history = [...messages.value, userMessage];
  messages.value = history;
  // The context lives on the message from here on; the composer chip clears
  // so it cannot leak into later, unrelated questions.
  selectedText.value = null;
  await generate(history);
}

export async function regenerate(): Promise<void> {
  if (streaming.value) return;
  const history = [...messages.value];
  let tail = history[history.length - 1];
  while (history.length && tail?.role === "assistant") {
    history.pop();
    tail = history[history.length - 1];
  }
  const lastUser = history[history.length - 1];
  if (!lastUser || lastUser.role !== "user") return;
  messages.value = history;
  await generate(history);
}

/** Attach selected text as context without sending or generating anything. */
export function attachSelectedContext(
  text: string,
  title: string,
  url: string,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const current = selectedText.value;
  if (current && current.text === trimmed && current.url === url) return;
  selectedText.value = { text: trimmed, title, url };
}

/** Consume a pending selection forwarded from the content script's pill. */
export async function consumeSelectedContext(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get(SELECTION_STORAGE_KEY);
    const raw: unknown = stored[SELECTION_STORAGE_KEY];
    if (!raw || typeof raw !== "object") return;
    if (!("text" in raw) || typeof raw.text !== "string") return;
    const title = "title" in raw && typeof raw.title === "string" ? raw.title : "";
    const url = "url" in raw && typeof raw.url === "string" ? raw.url : "";
    await chrome.storage.session.remove(SELECTION_STORAGE_KEY);
    attachSelectedContext(raw.text, title, url);
  } catch {
    // session storage unavailable; ignore
  }
}
