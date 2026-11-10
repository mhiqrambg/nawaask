import { signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Camera, Globe, Quote, Send, Square, X } from "lucide-preact";
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

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selection = selectedText.value;
  const image = screenshot.value;

  useEffect(() => {
    if (selection || image) inputRef.current?.focus();
  }, [selection, image]);

  const handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && !event.shiftKey && settings.value.enterToSend) {
      event.preventDefault();
      if (!streaming) submit(onSend);
    }
  };

  return (
    <div class="flex flex-col">
      {selection && <SelectionContextCard context={selection} />}
      {image && <ScreenshotCard image={image} />}
      {screenshotError.value && (
        <p class="mb-2 rounded-lg border border-red-400/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400">
          {screenshotError.value}
        </p>
      )}
      <div class="flex items-end gap-2 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2">
        <button
          type="button"
          class={`rounded p-1 hover:bg-[rgb(var(--color-bg))] ${
            pageContext.value ? "text-[rgb(var(--color-accent))]" : "text-[rgb(var(--color-muted))]"
          } disabled:opacity-40`}
          title={pageContext.value ? `Page attached: ${pageContext.value.title}` : attaching.value ? "Reading page…" : "Attach current page"}
          aria-label="Attach current page"
          disabled={streaming || attaching.value || Boolean(pageContext.value)}
          onClick={() => void attachPage()}
        >
          <Globe size={18} />
        </button>
        <button
          type="button"
          class={`rounded p-1 hover:bg-[rgb(var(--color-bg))] ${
            image ? "text-[rgb(var(--color-accent))]" : "text-[rgb(var(--color-muted))]"
          } disabled:opacity-40`}
          title={
            capturing.value
              ? "Capturing…"
              : image
                ? "Retake screenshot"
                : "Take screenshot of the current tab"
          }
          aria-label="Take screenshot of the current tab"
          disabled={streaming || capturing.value}
          onClick={() => void takeScreenshot()}
        >
          <Camera size={18} />
        </button>
        <textarea
          ref={inputRef}
          class="flex-1 resize-none bg-transparent text-[13.5px] outline-none placeholder:text-[rgb(var(--color-muted))]"
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
        {streaming ? (
          <button
            type="button"
            class="rounded-lg bg-red-500/10 p-1.5 text-red-400"
            title="Stop"
            aria-label="Stop generating"
            onClick={onStop}
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            type="button"
            class="rounded-lg bg-[rgb(var(--color-accent))] p-1.5 text-white disabled:opacity-40"
            title="Send"
            aria-label="Send message"
            onClick={() => submit(onSend)}
            disabled={draft.value.trim().length === 0}
          >
            <Send size={18} />
          </button>
        )}
      </div>
      {streaming && (
        <p class="mt-1 text-[10.5px] text-[rgb(var(--color-muted))]">Generating…</p>
      )}
    </div>
  ) as JSX.Element;
}
