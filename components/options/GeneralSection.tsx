import { settings, updateSettings, setTheme } from "@/composables/useSettings";
import {
  providers,
  setDefault,
  defaultProviderId,
  defaultModelId,
} from "@/composables/useProviders";
import CloudSection from "./CloudSection";
import { TRANSLATION_LANGUAGES } from "@/modules/prompts/templates";
import type { JSX } from "preact";

export default function GeneralSection() {
  const enabledProviders = providers.value.filter((p) => p.enabled);
  const activeProvider =
    providers.value.find((p) => p.id === defaultProviderId.value) ?? enabledProviders[0];

  return (
    <section class="flex flex-col gap-6 text-[13px]">
      <div class="flex flex-col gap-2">
        <h2 class="text-[12px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
          Appearance
        </h2>
        <div class="flex gap-2">
          {(["light", "dark", "system"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              class={`rounded-lg border px-3 py-1.5 ${
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
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-[12px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
          Defaults
        </h2>
        <label class="flex flex-col gap-1">
          <span class="text-[11px] text-[rgb(var(--color-muted))]">Default provider</span>
          <select
            class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
            value={defaultProviderId.value}
            onChange={(e) => {
              const pid = (e.currentTarget as HTMLSelectElement).value;
              const prov = providers.value.find((p) => p.id === pid);
              void setDefault(pid, prov?.defaultModel ?? prov?.models[0]?.id ?? "");
            }}
          >
            {providers.value.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.enabled}>
                {p.name}
                {p.enabled ? "" : " (disabled)"}
              </option>
            ))}
          </select>
        </label>
        {activeProvider && (
          <label class="flex flex-col gap-1">
            <span class="text-[11px] text-[rgb(var(--color-muted))]">Default model</span>
            <select
              class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
              value={defaultModelId.value}
              onChange={(e) => {
                const mid = (e.currentTarget as HTMLSelectElement).value;
                void setDefault(activeProvider.id, mid);
              }}
            >
              {activeProvider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label class="flex flex-col gap-1">
          <span class="text-[11px] text-[rgb(var(--color-muted))]">Translate to</span>
          <select
            class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
            value={settings.value.translationLanguage}
            onChange={(e) => {
              void updateSettings({
                translationLanguage: (e.currentTarget as HTMLSelectElement).value,
              });
            }}
          >
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.code || "auto"} value={l.code}>
                {l.code === "" ? "System default" : l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-[12px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
          Chat behavior
        </h2>
        <label class="flex items-center justify-between">
          <span>Enter to send</span>
          <input
            type="checkbox"
            checked={settings.value.enterToSend}
            onChange={(e) =>
              void updateSettings({ enterToSend: (e.currentTarget as HTMLInputElement).checked })
            }
          />
        </label>
        <label class="flex items-center justify-between">
          <span>Auto-scroll during streaming</span>
          <input
            type="checkbox"
            checked={settings.value.autoScroll}
            onChange={(e) =>
              void updateSettings({ autoScroll: (e.currentTarget as HTMLInputElement).checked })
            }
          />
        </label>
        <label class="flex items-center justify-between">
          <span>Include webpage context</span>
          <input
            type="checkbox"
            checked={settings.value.includePageContext}
            onChange={(e) =>
              void updateSettings({
                includePageContext: (e.currentTarget as HTMLInputElement).checked,
              })
            }
          />
        </label>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-[12px] uppercase tracking-wide text-[rgb(var(--color-muted))]">
          Operating mode
        </h2>
        <CloudSection />
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-[12px] uppercase tracking-wide text-[rgb(var(--color-muted))]">Privacy</h2>
        <p class="text-[11.5px] text-[rgb(var(--color-muted))]">
          API keys stay in Chrome extension storage on this device. Chrome does not encrypt them
          at rest; anyone with access to this browser profile can read them. NawaAsk never sends
          them anywhere except the provider base URL you configure.
        </p>
      </div>
    </section>
  ) as JSX.Element;
}
