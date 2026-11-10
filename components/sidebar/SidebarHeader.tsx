import { Plus, Settings } from "lucide-preact";
import { IconLogo } from "@/components/ui/Logo";
import { startNewChat } from "@/composables/useChat";
import { setSettingsOpen, view, setView } from "@/composables/useView";

export default function SidebarHeader() {
  return (
    <header class="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-3 py-2.5">
      <div class="flex items-center gap-2">
        <span class="text-[rgb(var(--color-accent))]">
          <IconLogo />
        </span>
        <div class="flex flex-col leading-tight">
          <span class="text-[14px] font-semibold">NawaAsk</span>
          <span class="text-[10px] text-[rgb(var(--color-muted))]">
            Your AI, Anywhere on the Web
          </span>
        </div>
      </div>
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
  );
}

