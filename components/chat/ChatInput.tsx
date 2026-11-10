import { signal } from "@preact/signals";
import { Paperclip, Send, Square } from "lucide-preact";
import { settings } from "@/composables/useSettings";
import type { JSX } from "preact";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
}

const draft = signal("");

function submit(onSend: (text: string) => void): void {
  const value = draft.value.trim();
  if (!value) return;
  draft.value = "";
  onSend(value);
}

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const handleKey = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && !event.shiftKey && settings.value.enterToSend) {
      event.preventDefault();
      if (!streaming) submit(onSend);
    }
  };

  return (
    <div class="flex flex-col">
      <div class="flex items-end gap-2 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2">
        <button
          type="button"
          class="rounded p-1 text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-bg))]"
          title="Attachments (coming soon)"
          aria-label="Attach file"
          disabled
        >
          <Paperclip size={18} />
        </button>
        <textarea
          class="flex-1 resize-none bg-transparent text-[13.5px] outline-none placeholder:text-[rgb(var(--color-muted))]"
          rows={1}
          placeholder={streaming ? "Generating…" : "Ask NawaAsk anything…"}
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
