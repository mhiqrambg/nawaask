import { SUGGESTED_PROMPTS } from "@/modules/prompts/system-prompts";
import {
  messages,
  streaming,
  errorMessage,
  pageContext,
  canSend,
  currentModel,
  startNewChat,
  sendMessage,
  stopGeneration,
  regenerate,
} from "@/composables/useChat";
import { getModelLabel } from "@/composables/useProviders";
import { toggleModelSelector } from "@/composables/useModelSelector";
import { setSettingsOpen } from "@/composables/useView";
import { settings } from "@/composables/useSettings";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Plus, Settings, X } from "lucide-preact";
import type { JSX } from "preact";

export default function ChatContainer() {
  const list = messages.value;
  const empty = list.length === 0 && !pageContext.value;
  const modelLabel = currentModel.value
    ? getModelLabel(currentModel.value.providerId, currentModel.value.modelId)
    : "No model";

  const onPrompt = (prompt: string): void => {
    void sendMessage(prompt);
  };

  return (
    <div class="flex h-full flex-col">
      <header class="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-3 py-2">
        <span class="text-[11px] text-[rgb(var(--color-muted))]">NawaAsk</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded p-1.5 hover:bg-[rgb(var(--color-surface))]"
            title="New chat"
            aria-label="New chat"
            onClick={() => void startNewChat()}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            class="rounded p-1.5 hover:bg-[rgb(var(--color-surface))]"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {empty ? (
        <div class="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
          <h2 class="text-lg font-semibold">How can I help?</h2>
          <div class="grid w-full grid-cols-1 gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p.title}
                type="button"
                class="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2.5 text-left hover:border-[rgb(var(--color-accent))]"
                onClick={() => onPrompt(p.prompt)}
              >
                <span class="mr-2 inline-flex align-middle" aria-hidden="true">
                  <p.icon size={14} />
                </span>
                <span class="text-[13px] font-medium">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={(el) => {
            if (el && settings.value.autoScroll) el.scrollTop = el.scrollHeight;
          }}
          class="flex flex-col overflow-y-auto px-3 py-3 gap-3"
        >
          {pageContext.value && (
            <div class="flex items-center justify-between gap-2 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-2 text-[11px] text-[rgb(var(--color-muted))]">
              <span class="truncate">Page context: {pageContext.value.title}</span>
              <button
                type="button"
                class="shrink-0 rounded p-0.5 hover:bg-[rgb(var(--color-bg))]"
                title="Remove page context"
                aria-label="Remove page context"
                onClick={() => {
                  pageContext.value = null;
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {list.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              streaming={streaming.value}
              onRegenerate={() => void regenerate()}
            />
          ))}
          {errorMessage.value && (
            <div
              class="rounded-lg border border-red-400/50 bg-red-500/10 px-2.5 py-2 text-[12px] text-red-400"
              role="alert"
            >
              {errorMessage.value}
            </div>
          )}
        </div>
      )}

      <footer class="border-t border-[rgb(var(--color-border))] px-3 py-2">
        <ChatInput
          onSend={(text) => void sendMessage(text)}
          onStop={() => stopGeneration()}
          streaming={streaming.value}
        />
        <button
          type="button"
          class="mt-2 w-full rounded-lg border border-[rgb(var(--color-border))] px-2 py-1 text-[11px] text-[rgb(var(--color-muted))] hover:border-[rgb(var(--color-accent))]"
          onClick={() => toggleModelSelector()}
          disabled={streaming.value}
          aria-label="Switch model"
        >
          Model: {modelLabel}
          {streaming.value ? " · streaming" : ""}
          {canSend.value ? "" : " (configure)"}
        </button>
      </footer>
    </div>
  ) as JSX.Element;
}

