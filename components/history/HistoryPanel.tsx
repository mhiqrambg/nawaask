import { signal } from "@preact/signals";
import { Pin } from "lucide-preact";
import {
  historyMeta,
  loadConversation,
  deleteConv,
  pinConversation,
  renameConversation,
} from "@/composables/useChat";
import {
  getConversation,
  exportConversationMarkdown,
} from "@/modules/storage/conversations";

function downloadMarkdown(id: string, title: string): void {
  void getConversation(id).then((conv) => {
    if (!conv) return;
    const blob = new Blob([exportConversationMarkdown(conv)], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w\- ]+/g, "").trim() || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function rename(id: string, current: string): void {
  const next = window.prompt("Rename conversation", current);
  if (next && next.trim() && next.trim() !== current) {
    void renameConversation(id, next.trim());
  }
}
const query = signal("");

function fmt(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function HistoryPanel() {
  const q = query.value.trim().toLowerCase();
  const filtered = historyMeta.value.filter(
    (m) => !q || m.title.toLowerCase().includes(q),
  );
  return (
    <div class="flex h-full flex-col">
      <header class="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-3 py-2">
        <h2 class="text-[13px] font-semibold">History</h2>
      </header>
      <div class="px-2 py-2">
        <input
          type="search"
          class="w-full rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-1.5 text-[12px] outline-none"
          placeholder="Search conversations…"
          aria-label="Search conversations"
          value={query.value}
          onInput={(e) => {
            query.value = (e.currentTarget as HTMLInputElement).value;
          }}
        />
      </div>
      <div class="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p class="px-2 py-6 text-center text-[12px] text-[rgb(var(--color-muted))]">
            {q ? "No matches." : "No conversations yet."}
          </p>
        ) : (
          filtered.map((meta) => (
            <article
              key={meta.id}
              class="mb-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2.5 py-2"
            >
              <button
                type="button"
                class="block w-full text-left"
                onClick={() => void loadConversation(meta.id)}
              >
                <p class="flex items-center gap-1 text-[13px] font-medium">
                  {meta.pinned && <Pin size={12} aria-label="Pinned" />}
                  {meta.title}
                </p>
                <p class="mt-0.5 text-[11px] text-[rgb(var(--color-muted))]">
                  {meta.messageCount} msg · {fmt(meta.updatedAt)}
                </p>
              </button>
              <div class="mt-1 flex flex-wrap gap-1 text-[11px]">
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 hover:bg-[rgb(var(--color-bg))]"
                  onClick={() => void pinConversation(meta.id, !meta.pinned)}
                >
                  {meta.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 hover:bg-[rgb(var(--color-bg))]"
                  onClick={() => rename(meta.id, meta.title)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 hover:bg-[rgb(var(--color-bg))]"
                  onClick={() => downloadMarkdown(meta.id, meta.title)}
                >
                  Export .md
                </button>
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 text-red-400 hover:bg-[rgb(var(--color-bg))]"
                  onClick={() => void deleteConv(meta.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
