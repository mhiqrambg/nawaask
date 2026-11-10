import { signal } from "@preact/signals";
import {
  providers,
  updateProvider,
  removeProvider,
  addProvider,
  toggleProviderEnabled,
  testProvider,
  refreshModels,
  createFromPreset,
  newCustomProvider,
  setDefault,
  defaultProviderId,
  defaultModelId,
} from "@/composables/useProviders";
import type { AIProvider } from "@/modules/ai/types";

const status = signal<Record<string, string>>({});

function setStatus(id: string, msg: string): void {
  status.value = { ...status.value, [id]: msg };
}

function patch(provider: AIProvider, partial: Partial<AIProvider>): void {
  void updateProvider({ ...provider, ...partial });
}

export default function ProvidersSection() {
  return (
    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        {providers.value.map((p) => (
          <button
            key={p.id}
            type="button"
            class="rounded-lg border border-[rgb(var(--color-border))] px-2.5 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
            onClick={() => {
              const preset = createFromPreset(p.id);
              if (preset) void addProvider({ ...preset, id: `${p.id}-${Date.now()}` });
            }}
            title={`Add another ${p.name} profile`}
          >
            + {p.name}
          </button>
        ))}
        <button
          type="button"
          class="rounded-lg border border-dashed border-[rgb(var(--color-border))] px-2.5 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
          onClick={() => void addProvider(newCustomProvider())}
        >
          + Custom provider
        </button>
      </div>

      {providers.value.map((p) => (
        <article
          key={p.id}
          class="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4"
        >
          <header class="flex items-center justify-between pb-3">
            <label class="flex items-center gap-2 text-[13.5px] font-medium">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) =>
                  void toggleProviderEnabled(
                    p.id,
                    (e.currentTarget as HTMLInputElement).checked,
                  )
                }
              />
              {p.name}
            </label>
            <div class="flex items-center gap-2 text-[11.5px]">
              <span class="text-[rgb(var(--color-muted))]">
                {defaultProviderId.value === p.id ? "Default" : ""}
              </span>
              <button
                type="button"
                class="text-red-400 hover:underline"
                onClick={() => void removeProvider(p.id)}
              >
                Remove
              </button>
            </div>
          </header>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] text-[rgb(var(--color-muted))]">Name</span>
              <input
                type="text"
                class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
                value={p.name}
                onInput={(e) =>
                  patch(p, { name: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] text-[rgb(var(--color-muted))]">Base URL</span>
              <input
                type="text"
                class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
                value={p.baseUrl}
                placeholder="https://api.openai.com/v1"
                onInput={(e) =>
                  patch(p, { baseUrl: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
            <label class="flex flex-col gap-1 sm:col-span-2">
              <span class="text-[11px] text-[rgb(var(--color-muted))]">API key</span>
              <input
                type="password"
                class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
                value={p.apiKey}
                placeholder="sk-…"
                onInput={(e) =>
                  patch(p, { apiKey: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
          </div>

          <div class="pt-3">
            <p class="pb-1 text-[11px] text-[rgb(var(--color-muted))]">Models</p>
            <div class="flex flex-wrap gap-1.5">
              {p.models.map((m) => {
                const isDefault =
                  defaultProviderId.value === p.id && defaultModelId.value === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    class={`rounded-lg px-2 py-1 text-[12px] ${
                      isDefault
                        ? "bg-[rgb(var(--color-accent))] text-white"
                        : "border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]"
                    }`}
                    title={isDefault ? "Default model" : "Set as default"}
                    onClick={() => void setDefault(p.id, m.id)}
                  >
                    {m.name || m.id}
                  </button>
                );
              })}
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
              <button
                type="button"
                class="rounded border border-[rgb(var(--color-border))] px-2 py-1 hover:border-[rgb(var(--color-accent))]"
                onClick={() => {
                  const id = window.prompt("Model ID", "gpt-4o-mini");
                  if (!id) return;
                  patch(p, {
                    models: [...p.models, { id, name: id, supportsStreaming: true }],
                  });
                }}
              >
                Add model
              </button>
              <button
                type="button"
                class="rounded border border-[rgb(var(--color-border))] px-2 py-1 hover:border-[rgb(var(--color-accent))]"
                onClick={() =>
                  void refreshModels(p.id)
                    .then((ids) => setStatus(p.id, `Loaded ${ids.length} models`))
                    .catch((err: Error) => setStatus(p.id, `Error: ${err.message}`))
                }
              >
                Fetch from API
              </button>
              <button
                type="button"
                class="rounded border border-[rgb(var(--color-border))] px-2 py-1 hover:border-[rgb(var(--color-accent))]"
                onClick={() =>
                  void testProvider(p)
                    .then((msg) => setStatus(p.id, msg))
                    .catch((err: Error) => setStatus(p.id, `Error: ${err.message}`))
                }
              >
                Test connection
              </button>
            </div>
            {status.value[p.id] && (
              <p class="pt-1 text-[11px] text-[rgb(var(--color-muted))]">{status.value[p.id]}</p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
