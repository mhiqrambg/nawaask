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
import type { PageContextResult, SelectionActionId } from "@/modules/browser/messaging";
import { buildSystemPrompt } from "@/modules/prompts/system-prompts";
import {
  promptForSelectionAction,
  fillPrompt,
} from "@/modules/prompts/templates";

export const messages = signal<ChatMessage[]>([]);
export const streaming = signal(false);
export const errorMessage = signal<string | null>(null);
export const pageContext = signal<PageContextResult | null>(null);
export const conversationId = signal<string | null>(null);
export const currentModel = signal<{ providerId: string; modelId: string } | null>(null);
export const historyMeta = signal<ConversationMeta[]>([]);
export const selectedText = signal<{ text: string; title: string; url: string } | null>(null);

let abortController: AbortController | null = null;

export const canSend = computed(
  () => !streaming.value && Boolean(currentModel.value),
);

export async function fetchPageContext(): Promise<PageContextResult | null> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
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
  if (conv.selectionContext) {
    selectedText.value = { text: conv.selectionContext, title: "", url: "" };
  } else {
    selectedText.value = null;
  }
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

function toCompletionMessages(
  history: ChatMessage[],
  system: string,
): ChatCompletionMessage[] {
  const prior = history.filter((m) => m.role !== "system" && !m.error);
  return [
    { role: "system", content: system },
    ...prior.map((m) => ({ role: m.role, content: m.content })),
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
        selectionContext: selectedText.value?.text ?? existing.selectionContext,
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
        selectionContext: selectedText.value?.text,
      };
  await putConversation(conv);
  await refreshHistory();
}

async function generate(history: ChatMessage[], userText: string): Promise<void> {
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
  const system = buildSystemPrompt({
    hasPageContext: Boolean(pageContext.value?.mainText),
    hasSelection: Boolean(selectedText.value),
    language: settings.language,
  });
  const convMessages = toCompletionMessages(history, system);
  if (pageContext.value?.mainText) {
    convMessages.push({
      role: "user",
      content: `[Webpage context]\nTitle: ${pageContext.value.title}\nURL: ${pageContext.value.url}\n\n${pageContext.value.mainText}`,
    });
  }
  if (selectedText.value) {
    convMessages.push({
      role: "user",
      content: `[Selected text]\n${selectedText.value.text}`,
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
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  };
  const history = [...messages.value, userMessage];
  messages.value = history;
  await generate(history, trimmed);
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
  await generate(history, lastUser.content);
}

/** Apply a selection action: populate selectedText then send a prompt. */
export async function applySelectionAction(
  action: SelectionActionId | "custom" | "summarize-page",
  text: string,
  title: string,
  url: string,
  promptTemplate?: string,
): Promise<void> {
  if (action === "summarize-page") {
    const context = await fetchPageContext();
    if (context) pageContext.value = context;
    await sendMessage("Summarize this page into concise bullet points.");
    return;
  }
  selectedText.value = { text, title, url };
  const template =
    promptTemplate ?? promptForSelectionAction(action === "custom" ? "ask" : action).template;
  await sendMessage(fillPrompt(template, { selection: text, title, url }));
}

/** Consume pending action set by background (context menu / selection toolbar). */
export async function consumePendingAction(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get("nawa:pending-action");
    const raw: unknown = stored["nawa:pending-action"];
    if (!raw || typeof raw !== "object") return;
    if (!("action" in raw) || typeof raw.action !== "string") return;
    const text = "text" in raw && typeof raw.text === "string" ? raw.text : "";
    const title = "title" in raw && typeof raw.title === "string" ? raw.title : "";
    const url = "url" in raw && typeof raw.url === "string" ? raw.url : "";
    await chrome.storage.session.remove("nawa:pending-action");
    await applySelectionAction(
      raw.action as SelectionActionId | "custom" | "summarize-page",
      text,
      title,
      url,
    );
  } catch {
    // session storage unavailable; ignore
  }
}
