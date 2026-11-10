import { signal } from "@preact/signals";
import { Copy, RefreshCw } from "lucide-preact";
import type { JSX } from "preact";

interface Props {
  content: string;
  onRegenerate: () => void;
}

const copied = signal(false);

function copy(content: string): void {
  void navigator.clipboard
    .writeText(content)
    .then(() => {
      copied.value = true;
      window.setTimeout(() => {
        copied.value = false;
      }, 1200);
    })
    .catch(() => {
      copied.value = false;
    });
}

export default function MessageActions({ content, onRegenerate }: Props) {
  return (
    <div class="flex items-center gap-1 pl-1 text-[rgb(var(--color-muted))]">
      <button
        type="button"
        class="rounded p-1 hover:bg-[rgb(var(--color-surface))]"
        title="Copy"
        aria-label="Copy response"
        onClick={() => copy(content)}
      >
        <Copy size={16} />
      </button>
      <button
        type="button"
        class="rounded p-1 hover:bg-[rgb(var(--color-surface))]"
        title="Regenerate"
        aria-label="Regenerate response"
        onClick={onRegenerate}
      >
        <RefreshCw size={16} />
      </button>
      {copied.value && (
        <span class="text-[11px] opacity-70" role="status">
          Copied
        </span>
      )}
    </div>
  );
}
