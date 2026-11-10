import { view, setView } from "@/composables/useView";
import type { FunctionalComponent } from "preact";

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "history", label: "History" },
] as const;

const SidebarNavigation: FunctionalComponent = () => (
  <nav class="flex gap-1 border-b border-[rgb(var(--color-border))] px-3 py-1.5" aria-label="Views">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        class={`rounded-lg px-2.5 py-1 text-[12px] ${
          view.value === tab.id
            ? "bg-[rgb(var(--color-accent))]/15 text-[rgb(var(--color-accent))]"
            : "text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-surface))]"
        }`}
        aria-current={view.value === tab.id ? "page" : undefined}
        onClick={() => setView(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default SidebarNavigation;
