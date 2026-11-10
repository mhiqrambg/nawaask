import { IconLogo } from "@/components/ui/Logo";

async function openSidePanel(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab?.id) return;
  await chrome.sidePanel.open({ tabId: activeTab.id });
  window.close();
}

async function openOptions(): Promise<void> {
  await chrome.runtime.openOptionsPage();
  window.close();
}

export default function PopupApp() {
  return (
    <div class="w-64 p-4">
      <div class="mb-4 flex items-center gap-2">
        <span class="text-[rgb(var(--color-accent))]">
          <IconLogo />
        </span>
        <div>
          <p class="text-[14px] font-semibold">NawaAsk</p>
          <p class="text-[10.5px] text-[rgb(var(--color-muted))]">
            Your AI, Anywhere on the Web
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="rounded-lg bg-[rgb(var(--color-accent))] px-3 py-2 text-[13px] font-medium text-white hover:opacity-90"
          onClick={() => void openSidePanel()}
        >
          Open Assistant
        </button>
        <button
          type="button"
          class="rounded-lg border border-[rgb(var(--color-border))] px-3 py-2 text-[13px] hover:border-[rgb(var(--color-accent))]"
          onClick={() => void openOptions()}
        >
          Settings
        </button>
      </div>
      <p class="mt-3 text-[10.5px] text-[rgb(var(--color-muted))]">
        Tip: select text or take a screenshot, then ask about it.
      </p>
    </div>
  );
}
