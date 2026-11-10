import { signal } from "@preact/signals";
import { settings, updateSettings, setTheme } from "@/composables/useSettings";
import {
  providers,
  updateProvider,
  removeProvider,
  toggleProviderEnabled,
  testProvider,
  refreshModels,
} from "@/composables/useProviders";
import { setSettingsOpen } from "@/composables/useView";
import { IconClose } from "@/components/ui/icons";
import type { AIProvider } from "@/modules/ai/types";

const testStatus = signal<Record<string, string>>({});

function setProviderField(provider: AIProvider, patch: Partial<AIProvider>): void {
  void updateProvider({ ...provider, ...patch });
}

export default function SettingsPanel() {
  return (
    <div class="flex h-full flex-col">
      <header class="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-3 py-2">
        <h2 class="text-[13px] font-semibold">Settings</h2>
        <button
          type="button"
          class="rounded p-1 hover:bg-[rgb(var(--color-surface))]"
          aria-label="Close settings"
          onClick={() => setSettingsOpen(false)}
        >
          <IconClose />
        </button>
      </header>

      <div class="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4 text-[12.5px]">
        {/* Appearance */}
        <section class="flex flex-col gap-1.5">
          <h3 class="text-[11px] uppercase tracking-wide text-[rgb(var(--color-muted))]">Appearance</h3>
          <div class="flex gap-1">
            {(["light", "dark", "system"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                class={`flex-1 rounded-lg border px-2 py-1.5 ${
                  settings.value.theme === mode
                    ? "border-[rgb(var(--color-accent))] text-[rgb(var(--color-accent))]"
                    : "border-[rgb(var(--color-border))]"
                }`}
                onClick={() => setTheme(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        {/* General */}
        <section class="flex flex-col gap-2">
          <h3 class="text-[11px] uppercase tracking-wide text-[rgb(var(--color-muted))]">General</h3>
          <label class="flex items-center justify-between">
            <span>Enter to send</span>
            <input
              type="checkbox"
              checked={settings.value.enterToSend}
              onChange={(e) => {
                void updateSettings({ enterToSend: (e.currentTarget as HTMLInputElement).checked });
              }}
            />
          </label>
          <label class="flex items-center justify-between">
            <span>Auto-scroll</span>
            <input
              type="checkbox"
              checked={settings.value.autoScroll}
              onChange={(e) => {
                void updateSettings({ autoScroll: (e.currentTarget as HTMLInputElement).checked });
              }}
            />
          </label>
          <label class="flex items-center justify-between">
            <span>Floating selection toolbar</span>
            <input
              type="checkbox"
              checked={settings.value.showFloatingToolbar}
              onChange={(e) => {
                void updateSettings({
                  showFloatingToolbar: (e.currentTarget as HTMLInputElement).checked,
                });
              }}
            />
          </label>
        </section>

        {/* Providers */}
        <section class="flex flex-col gap-2">
          <h3 class="text-[11px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
            AI Providers
          </h3>
          {providers.value.map((p) => (
            <div key={p.id} class="rounded-xl border border-[rgb(var(--color-border))] p-2.5">
              <div class="flex items-center justify-between pb-2">
                <label class="flex items-center gap-2 text-[12.5px] font-medium">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => {
                      void toggleProviderEnabled(
                        p.id,
                        (e.currentTarget as HTMLInputElement).checked,
                      );
                    }}
                  />
                  {p.name}
                </label>
                <button
                  type="button"
                  class="text-[11px] text-red-400 hover:underline"
                  onClick={() => void removeProvider(p.id)}
                >
                  Remove
                </button>
              </div>
              <label class="block pb-1.5">
                <span class="text-[11px] text-[rgb(var(--color-muted))]">Base URL</span>
                <input
                  type="text"
                  class="w-full rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-1 text-[12px]"
                  value={p.baseUrl}
                  onInput={(e) =>
                    setProviderField(p, {
                      baseUrl: (e.currentTarget as HTMLInputElement).value,
                    })
                  }
                />
              </label>
              <label class="block pb-1.5">
                <span class="text-[11px] text-[rgb(var(--color-muted))]">API key</span>
                <input
                  type="password"
                  class="w-full rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-1 text-[12px]"
                  value={p.apiKey}
                  placeholder="sk-…"
                  onInput={(e) =>
                    setProviderField(p, {
                      apiKey: (e.currentTarget as HTMLInputElement).value,
                    })
                  }
                />
              </label>
              <div class="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  class="rounded border border-[rgb(var(--color-border))] px-2 py-1 text-[11px] hover:border-[rgb(var(--color-accent))]"
                  onClick={() => {
                    void testProvider(p)
                      .then((msg) => {
                        testStatus.value = { ...testStatus.value, [p.id]: msg };
                      })
                      .catch((err: Error) => {
                        testStatus.value = {
                          ...testStatus.value,
                          [p.id]: `Error: ${err.message}`,
                        };
                      });
                  }}
                >
                  Test
                </button>
                <button
                  type="button"
                  class="rounded border border-[rgb(var(--color-border))] px-2 py-1 text-[11px] hover:border-[rgb(var(--color-accent))]"
                  onClick={() => {
                    void refreshModels(p.id)
                      .then((ids) => {
                        testStatus.value = {
                          ...testStatus.value,
                          [p.id]: `Loaded ${ids.length} models`,
                        };
                      })
                      .catch((err: Error) => {
                        testStatus.value = {
                          ...testStatus.value,
                          [p.id]: `Error: ${err.message}`,
                        };
                      });
                  }}
                >
                  Refresh models
                </button>
                {testStatus.value[p.id] && (
                  <span class="text-[10.5px] text-[rgb(var(--color-muted))]">
                    {testStatus.value[p.id]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        <p class="text-[10.5px] text-[rgb(var(--color-muted))]">
          API keys are stored in extension storage on this device only. Never sent to us.
        </p>
      </div>
    </div>
  );
}
