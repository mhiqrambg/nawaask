import { modelSelectorOpen } from "@/composables/useModelSelector";
import { providers, setDefault, defaultProviderId, defaultModelId } from "@/composables/useProviders";
import { currentModel } from "@/composables/useChat";
import { setSettingsOpen } from "@/composables/useView";
import { X } from "lucide-preact";
import type { JSX } from "preact";

export default function ModelSelector() {
  if (!modelSelectorOpen.value) return null;

  const active = currentModel.value;
  const activePid = active?.providerId ?? defaultProviderId.value;
  const activeMid = active?.modelId ?? defaultModelId.value;

  const enabled = providers.value.filter((p) => p.enabled && p.apiKey);
  const disabled = providers.value.filter((p) => !p.enabled || !p.apiKey);

  return (
    <div
      class="absolute inset-0 z-30 flex flex-col justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Select model"
    >
      <div class="max-h-[70%] overflow-y-auto rounded-t-2xl bg-[rgb(var(--color-bg))] p-3 shadow-lg">
        <div class="flex items-center justify-between pb-2">
          <h3 class="text-[13px] font-semibold">Switch model</h3>
          <button
            type="button"
            class="rounded p-1 hover:bg-[rgb(var(--color-surface))]"
            aria-label="Close"
            onClick={() => {
              modelSelectorOpen.value = false;
            }}
          >
            <X size={16} />
          </button>
        </div>

        {enabled.length === 0 && (
          <p class="pb-3 text-[12px] text-[rgb(var(--color-muted))]">
            No enabled providers with API keys.
            <button
              type="button"
              class="ml-1 underline"
              onClick={() => {
                modelSelectorOpen.value = false;
                setSettingsOpen(true);
              }}
            >
              Open settings
            </button>
          </p>
        )}

        <div class="flex flex-col gap-2">
          {enabled.map((p) => (
            <div key={p.id} class="rounded-xl border border-[rgb(var(--color-border))] p-2">
              <p class="pb-1 text-[12px] font-medium">{p.name}</p>
              <div class="flex flex-wrap gap-1">
                {p.models.map((m) => {
                  const isActive = p.id === activePid && m.id === activeMid;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      class={`rounded-lg px-2 py-1 text-[11.5px] ${
                        isActive
                          ? "bg-[rgb(var(--color-accent))] text-white"
                          : "border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]"
                      }`}
                      onClick={() => {
                        void setDefault(p.id, m.id);
                        currentModel.value = { providerId: p.id, modelId: m.id };
                        modelSelectorOpen.value = false;
                      }}
                      aria-pressed={isActive}
                    >
                      {m.name || m.id}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {disabled.length > 0 && (
            <p class="text-[11px] text-[rgb(var(--color-muted))]">
              {disabled.length} provider{disabled.length > 1 ? "s" : ""} disabled or missing API
              key.
            </p>
          )}
        </div>
      </div>
    </div>
  ) as JSX.Element;
}
