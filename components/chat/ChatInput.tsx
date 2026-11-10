import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import {
  Camera,
  Check,
  ChevronUp,
  Globe,
  Quote,
  Send,
  Square,
  X,
} from "lucide-preact";
import { settings } from "@/composables/useSettings";
import {
  capturing,
  clearScreenshot,
  fetchPageContext,
  pageContext,
  screenshot,
  screenshotError,
  selectedText,
  takeScreenshot,
} from "@/composables/useChat";
import {
  closeModelDropdown,
  extendedThinking,
  modelDropdownOpen,
  selectModel,
  setExtendedThinking,
  toggleModelDropdown,
} from "@/composables/useModelSelector";
import { providers } from "@/composables/useProviders";
import { currentModel } from "@/composables/useChat";
import type { SelectionContext } from "@/modules/browser/messaging";
import type { ScreenshotAttachment } from "@/modules/ai/types";
import type { JSX } from "preact";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
}

const attaching = signal(false);

async function attachPage(): Promise<void> {
  attaching.value = true;
  try {
    const context = await fetchPageContext();
    if (context) pageContext.value = context;
  } finally {
    attaching.value = false;
  }
}

const draft = signal("");

function submit(onSend: (text: string) => void): void {
  const value = draft.value.trim();
  if (!value) return;
  draft.value = "";
  onSend(value);
}

function sourceLabel(source: { title: string; url: string }): string {
  let host = "";
  try {
    host = new URL(source.url).hostname;
  } catch {
    host = source.url;
  }
  if (source.title && host) return `${source.title} · ${host}`;
  return source.title || host || source.url;
}

function SelectionContextCard({ context }: { context: SelectionContext }): JSX.Element {
  const preview =
    context.text.length > 280 ? `${context.text.slice(0, 280)}…` : context.text;
  return (
    <div
      class="mb-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-2"
      title={context.url}
    >
      <div class="flex items-start gap-2">
        <span class="mt-0.5 shrink-0 text-[rgb(var(--color-accent))]" aria-hidden="true">
          <Quote size={13} />
        </span>
        <div class="min-w-0 flex-1">
          <p class="line-clamp-2 text-[11.5px] leading-snug">“{preview}”</p>
          <p class="mt-1 truncate text-[10px] text-[rgb(var(--color-muted))]">
            From {sourceLabel(context)}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-bg))]"
          title="Remove selected text"
          aria-label="Remove selected text context"
          onClick={() => {
            selectedText.value = null;
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  ) as JSX.Element;
}

function ScreenshotCard({ image }: { image: ScreenshotAttachment }): JSX.Element {
  return (
    <div
      class="mb-2 flex items-center gap-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-2"
      title={image.url}
    >
      <img
        src={image.dataUrl}
        alt={`Screenshot of ${sourceLabel(image)}`}
        class="h-12 w-16 shrink-0 rounded-md border border-[rgb(var(--color-border))] object-cover"
      />
      <div class="min-w-0 flex-1">
        <p class="text-[11.5px] leading-snug">Screenshot</p>
        <p class="truncate text-[10px] text-[rgb(var(--color-muted))]">
          From {sourceLabel(image)}
        </p>
        <p class="text-[9.5px] text-[rgb(var(--color-muted))]">
          {image.width}×{image.height}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-bg))]"
        title="Remove screenshot"
        aria-label="Remove screenshot"
        onClick={clearScreenshot}
      >
        <X size={12} />
      </button>
    </div>
  ) as JSX.Element;
}

/** Toggle switch for Extended Thinking. */
function ThinkingToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Extended thinking"
      class={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[rgb(var(--color-accent))]" : "bg-[rgb(var(--color-border))]"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        class={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const selection = selectedText.value;
  const image = screenshot.value;

  useEffect(() => {
    if (selection || image) inputRef.current?.focus();
  }, [selection, image]);

  // Close dropdown on outside click or Escape.
  useEffect(() => {
    if (!modelDropdownOpen.value) return;
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (dropdownRef.current?.contains(t) || pillRef.current?.contains(t)) return;
      closeModelDropdown();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closeModelDropdown();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [modelDropdownOpen.value]);

  const handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && !event.shiftKey && settings.value.enterToSend) {
      event.preventDefault();
      if (!streaming) submit(onSend);
    }
  };

  const active = currentModel.value;
  const activeProvider = providers.value.find((p) => p.id === active?.providerId);
  const activeModel = activeProvider?.models.find((m) => m.id === active?.modelId);
  const pillLabel = activeModel?.name || active?.modelId || "Model";
  const showThinking = activeModel?.supportsExtendedThinking === true;
  const enabledProviders = providers.value.filter((p) => p.enabled && p.apiKey);

  return (
    <div class="relative flex flex-col">
      {selection && <SelectionContextCard context={selection} />}
      {image && <ScreenshotCard image={image} />}
      {screenshotError.value && (
        <p class="mb-2 rounded-lg border border-red-400/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400">
          {screenshotError.value}
        </p>
      )}

      {/* Model dropdown – opens upward from the pill */}
      {modelDropdownOpen.value && (
        <div
          ref={dropdownRef}
          class="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[360px] overflow-y-auto rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-2xl shadow-black/40"
          role="listbox"
          aria-label="Select model"
        >
          {enabledProviders.length === 0 && (
            <p class="px-3.5 py-3 text-[12px] text-[rgb(var(--color-muted))]">
              No providers configured. Open Settings to add one.
            </p>
          )}
          {enabledProviders.map((p) => (
            <div key={p.id}>
              <p class="px-3.5 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--color-muted))]">
                {p.name}
              </p>
              {p.models.map((m) => {
                const isActive =
                  p.id === active?.providerId && m.id === active?.modelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    class="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-[rgb(var(--color-bg))]"
                    onClick={() => selectModel(p.id, m.id)}
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-[13px] font-medium text-[rgb(var(--color-fg))]">
                        {m.name || m.id}
                      </p>
                      <p class="truncate text-[11px] text-[rgb(var(--color-muted))]">
                        {m.description || m.id}
                      </p>
                    </div>
                    {isActive && (
                      <Check
                        size={16}
                        class="shrink-0 text-[rgb(var(--color-accent))]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {showThinking && (
            <div class="mt-1 border-t border-[rgb(var(--color-border))] px-3.5 py-2.5">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[12.5px] font-medium text-[rgb(var(--color-fg))]">
                    Extended Thinking
                  </p>
                  <p class="text-[11px] text-[rgb(var(--color-muted))]">
                    Thinks longer for complex tasks
                  </p>
                </div>
                <ThinkingToggle
                  checked={extendedThinking.value}
                  onChange={setExtendedThinking}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer box */}
      <div class="flex flex-col rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2">
        <textarea
          ref={inputRef}
          class="resize-none bg-transparent text-[13.5px] outline-none placeholder:text-[rgb(var(--color-muted))]"
          rows={1}
          placeholder={
            streaming
              ? "Generating…"
              : image
                ? "Ask about this screenshot…"
                : selection
                  ? "Ask about the selected text…"
                  : "Ask NawaAsk anything…"
          }
          aria-label="Message"
          value={draft.value}
          onInput={(e) => {
            draft.value = (e.currentTarget as HTMLTextAreaElement).value;
          }}
          onKeyDown={handleKey}
        />

        {/* Bottom toolbar */}
        <div class="flex items-center justify-between pt-1.5">
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class={`rounded p-1 hover:bg-[rgb(var(--color-bg))] ${
                pageContext.value
                  ? "text-[rgb(var(--color-accent))]"
                  : "text-[rgb(var(--color-muted))"
              } disabled:opacity-40`}
              title={
                pageContext.value
                  ? `Page attached: ${pageContext.value.title}`
                  : attaching.value
                    ? "Reading page…"
                    : "Attach current page"
              }
              aria-label="Attach current page"
              disabled={streaming || attaching.value || Boolean(pageContext.value)}
              onClick={() => void attachPage()}
            >
              <Globe size={17} />
            </button>
            <button
              type="button"
              class={`rounded p-1 hover:bg-[rgb(var(--color-bg))] ${
                image
                  ? "text-[rgb(var(--color-accent))]"
                  : "text-[rgb(var(--color-muted))]"
              } disabled:opacity-40`}
              title={
                capturing.value
                  ? "Selecting a region…"
                  : image
                    ? "Select another region"
                    : "Select a region of the current tab"
              }
              aria-label="Select a region of the current tab to capture"
              disabled={streaming || capturing.value}
              onClick={() => void takeScreenshot()}
            >
              <Camera size={17} />
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              ref={pillRef}
              type="button"
              class="flex items-center gap-1 rounded-full border border-[rgb(var(--color-border))] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--color-fg))] transition-colors hover:border-[rgb(var(--color-accent))]"
              title="Switch model"
              aria-label={`Current model: ${pillLabel}. Click to change.`}
              aria-expanded={modelDropdownOpen.value}
              disabled={streaming}
              onClick={toggleModelDropdown}
            >
              <span class="max-w-[140px] truncate">{pillLabel}</span>
              <ChevronUp size={12} class="text-[rgb(var(--color-muted))]" />
            </button>

            {streaming ? (
              <button
                type="button"
                class="rounded-full bg-red-500/10 p-2 text-red-400"
                title="Stop"
                aria-label="Stop generating"
                onClick={onStop}
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="button"
                class="rounded-full bg-[rgb(var(--color-accent))] p-2 text-white disabled:opacity-40"
                title="Send"
                aria-label="Send message"
                onClick={() => submit(onSend)}
                disabled={draft.value.trim().length === 0}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {streaming && (
        <p class="mt-1 text-[10.5px] text-[rgb(var(--color-muted))]">Generating…</p>
      )}
    </div>
  ) as JSX.Element;
}
