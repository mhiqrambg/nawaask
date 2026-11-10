import { signal } from "@preact/signals";
import { settings, updateSettings, setTheme } from "@/composables/useSettings";
import {
  providers,
  updateProvider,
  removeProvider,
  addProvider,
  hasUnfinishedProvider,
  toggleProviderEnabled,
  testProvider,
  refreshModels,
  newCustomProvider,
} from "@/composables/useProviders";
import { protocolOf } from "@/modules/ai/protocol";
import { setSettingsOpen } from "@/composables/useView";
import { IconClose, IconPlus } from "@/components/ui/icons";
import type { AIProvider, ProviderApi, ProviderProtocol } from "@/modules/ai/types";

const testStatus = signal<Record<string, string>>({});

function setProviderField(provider: AIProvider, patch: Partial<AIProvider>): void {
  void updateProvider({ ...provider, ...patch });
}

function ProviderCard({ provider }: { provider: AIProvider }) {
  const p = provider;
  const protocol = protocolOf(p);
  return (
    <div key={p.id} class="rounded-xl border border-[rgb(var(--color-border))] p-2.5">
      <div class="flex items-center justify-between pb-2">
        <label class="flex items-center gap-2 text-[12.5px] font-medium">
          <input
            type="checkbox"
            checked={p.enabled}
            onChange={(e) => {
              void toggleProviderEnabled(p.id, (e.currentTarget as HTMLInputElement).checked);
            }}
          />
          {p.name}
        </label>
        <div class="flex items-center gap-2 text-[11px]">
          <span class="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5 text-[10.5px] text-[rgb(var(--color-muted))]">
            {protocol === "anthropic" ? "Anthropic" : "OpenAI"}
          </span>
          <button
            type="button"
            class="text-red-400 hover:underline"
            onClick={() => void removeProvider(p.id)}
          >
            Remove
          </button>
        </div>
      </div>
      <label class="block pb-1.5">
        <span class="text-[11px] text-[rgb(var(--color-muted))]">Protocol</span>
        <select
          class="w-full rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-1 text-[12px]"
          value={protocol}
          onChange={(e) => {
            const next = (e.currentTarget as HTMLSelectElement).value as ProviderProtocol;
            applyProtocol(p, next);
          }}
        >
          <option value="openai">OpenAI Compatible</option>
          <option value="anthropic">Anthropic Compatible</option>
        </select>
      </label>
      {protocol === "openai" && (
        <label class="block pb-1.5">
          <span class="text-[11px] text-[rgb(var(--color-muted))]">API</span>
          <select
            class="w-full rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-1 text-[12px]"
            value={p.api ?? "chat-completions"}
            onChange={(e) => {
              setProviderField(p, {
                api: (e.currentTarget as HTMLSelectElement).value as ProviderApi,
              });
            }}
          >
            <option value="chat-completions">Chat Completions</option>
            <option value="responses">Responses</option>
          </select>
        </label>
      )}
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
  );
}

function applyProtocol(p: AIProvider, next: ProviderProtocol): void {
  const hint =
    next === "anthropic" ? "https://api.anthropic.com/v1" : "https://api.example.com/v1";
  setProviderField(p, {
    protocol: next,
    baseUrl: p.baseUrl === "" || p.baseUrl === "https://api.example.com/v1" ? hint : p.baseUrl,
  });
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
          <div class="flex items-center justify-between">
            <h3 class="text-[11px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
              Custom Providers
            </h3>
            <button
              type="button"
              class="flex items-center gap-1 rounded-lg border border-[rgb(var(--color-border))] px-2 py-0.5 text-[11px] hover:border-[rgb(var(--color-accent))] disabled:opacity-40"
              disabled={hasUnfinishedProvider()}
              title={
                hasUnfinishedProvider()
                  ? "Finish configuring the new provider first"
                  : "Add a custom provider"
              }
              onClick={() => void addProvider(newCustomProvider())}
            >
              <IconPlus size={12} />
              New
            </button>
          </div>
          {providers.value.length === 0 ? (
            <div class="rounded-xl border border-dashed border-[rgb(var(--color-border))] px-3 py-4 text-center">
              <p class="text-[12px] text-[rgb(var(--color-muted))]">
                No providers yet. Add one to start chatting.
              </p>
              <button
                type="button"
                class="mt-2 rounded-lg border border-[rgb(var(--color-border))] px-3 py-1.5 text-[12px] hover:border-[rgb(var(--color-accent))]"
                onClick={() => void addProvider(newCustomProvider())}
              >
                Add custom provider
              </button>
            </div>
          ) : (
            providers.value.map((p) => <ProviderCard key={p.id} provider={p} />)
          )}
          <button
            type="button"
            class="self-start text-[11px] text-[rgb(var(--color-muted))] underline"
            onClick={() => void chrome.runtime.openOptionsPage()}
          >
            Open full settings page
          </button>
        </section>

        <p class="text-[10.5px] text-[rgb(var(--color-muted))]">
          API keys are stored in extension storage on this device only. Never sent to us.
        </p>
      </div>
    </div>
  );
}
