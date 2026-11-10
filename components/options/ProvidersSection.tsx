import { useState } from "preact/hooks";
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
import { isCustomProvider, protocolOf, PROVIDER_PRESETS } from "@/modules/ai/provider-presets";
import type { AIProvider, ProviderProtocol } from "@/modules/ai/types";
import { IconChevron, IconPlus } from "@/components/ui/icons";

const status = signal<Record<string, string>>({});

function setStatus(id: string, msg: string): void {
  status.value = { ...status.value, [id]: msg };
}

function patch(provider: AIProvider, partial: Partial<AIProvider>): void {
  void updateProvider({ ...provider, ...partial });
}

function runTest(p: AIProvider): void {
  void testProvider(p)
    .then((msg) => setStatus(p.id, msg))
    .catch((err: Error) => setStatus(p.id, `Error: ${err.message}`));
}

function runRefresh(p: AIProvider): void {
  void refreshModels(p.id)
    .then((ids) => setStatus(p.id, `Loaded ${ids.length} models`))
    .catch((err: Error) => setStatus(p.id, `Error: ${err.message}`));
}

function addModel(p: AIProvider): void {
  const id = window.prompt("Model ID", "gpt-4o-mini");
  if (!id) return;
  patch(p, { models: [...p.models, { id, name: id, supportsStreaming: true }] });
}

const PROTOCOLS: { id: ProviderProtocol; label: string; hint: string }[] = [
  { id: "openai", label: "OpenAI Compatible", hint: "https://api.example.com/v1" },
  { id: "anthropic", label: "Anthropic Compatible", hint: "https://api.anthropic.com/v1" },
];

function ProviderCard({ provider, showProtocol }: { provider: AIProvider; showProtocol: boolean }) {
  const p = provider;
  const protocol = protocolOf(p);
  return (
    <article class="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      <header class="flex items-center justify-between pb-3">
        <label class="flex items-center gap-2 text-[13.5px] font-medium">
          <input
            type="checkbox"
            checked={p.enabled}
            onChange={(e) =>
              void toggleProviderEnabled(p.id, (e.currentTarget as HTMLInputElement).checked)
            }
          />
          {p.name}
        </label>
        <div class="flex items-center gap-2 text-[11.5px]">
          {showProtocol && (
            <span class="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5 text-[10.5px] text-[rgb(var(--color-muted))]">
              {protocol === "anthropic" ? "Anthropic" : "OpenAI"}
            </span>
          )}
          {defaultProviderId.value === p.id && (
            <span class="text-[rgb(var(--color-muted))]">Default</span>
          )}
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
            onInput={(e) => patch(p, { name: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
        {showProtocol ? (
          <label class="flex flex-col gap-1">
            <span class="text-[11px] text-[rgb(var(--color-muted))]">Protocol</span>
            <select
              class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
              value={protocol}
              onChange={(e) => {
                const next = (e.currentTarget as HTMLSelectElement).value as ProviderProtocol;
                const hint = PROTOCOLS.find((pr) => pr.id === next)?.hint ?? "";
                patch(p, {
                  protocol: next,
                  baseUrl:
                    p.baseUrl === "" || p.baseUrl === "https://api.example.com/v1"
                      ? hint
                      : p.baseUrl,
                });
              }}
            >
              {PROTOCOLS.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <label class="flex flex-col gap-1 sm:col-span-2">
          <span class="text-[11px] text-[rgb(var(--color-muted))]">Base URL</span>
          <input
            type="text"
            class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
            value={p.baseUrl}
            placeholder={PROTOCOLS.find((pr) => pr.id === protocol)?.hint}
            onInput={(e) => patch(p, { baseUrl: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
        <label class="flex flex-col gap-1 sm:col-span-2">
          <span class="text-[11px] text-[rgb(var(--color-muted))]">API key</span>
          <input
            type="password"
            class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
            value={p.apiKey}
            placeholder="sk-…"
            onInput={(e) => patch(p, { apiKey: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
      </div>

      <div class="pt-3">
        <p class="pb-1 text-[11px] text-[rgb(var(--color-muted))]">Models</p>
        <div class="flex flex-wrap gap-1.5">
          {p.models.map((m) => {
            const isDefault = defaultProviderId.value === p.id && defaultModelId.value === m.id;
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
            onClick={() => addModel(p)}
          >
            Add model
          </button>
          <button
            type="button"
            class="rounded border border-[rgb(var(--color-border))] px-2 py-1 hover:border-[rgb(var(--color-accent))]"
            onClick={() => runRefresh(p)}
          >
            Fetch from API
          </button>
          <button
            type="button"
            class="rounded border border-[rgb(var(--color-border))] px-2 py-1 hover:border-[rgb(var(--color-accent))]"
            onClick={() => runTest(p)}
          >
            Test connection
          </button>
        </div>
        {status.value[p.id] && (
          <p class="pt-1 text-[11px] text-[rgb(var(--color-muted))]">{status.value[p.id]}</p>
        )}
      </div>
    </article>
  );
}

function GroupHeader({
  title,
  count,
  open,
  onToggle,
  action,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  action: preact.ComponentChildren;
}) {
  return (
    <div class="mb-2 flex items-center justify-between">
      <button
        type="button"
        class="flex items-center gap-1.5 text-[13.5px] font-semibold"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span
          class={`inline-block transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        >
          <IconChevron />
        </span>
        {title}
        <span class="rounded-full bg-[rgb(var(--color-surface))] px-2 py-0.5 text-[11px] font-normal text-[rgb(var(--color-muted))]">
          {count}
        </span>
      </button>
      {action}
    </div>
  );
}

export default function ProvidersSection() {
  const [openOfficial, setOpenOfficial] = useState(true);
  const [openCustom, setOpenCustom] = useState(true);
  const official = providers.value.filter((p) => !isCustomProvider(p));
  const custom = providers.value.filter((p) => isCustomProvider(p));

  return (
    <section class="flex flex-col gap-5">
      <div>
        <GroupHeader
          title="Providers"
          count={official.length}
          open={openOfficial}
          onToggle={() => setOpenOfficial((v) => !v)}
          action={<span class="text-[11px] text-[rgb(var(--color-muted))]">Official presets</span>}
        />
        {openOfficial && (
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-1.5">
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  class="rounded-lg border border-dashed border-[rgb(var(--color-border))] px-2.5 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
                  title={`Add another ${preset.name} profile`}
                  onClick={() => {
                    const copy = createFromPreset(preset.id);
                    if (copy) void addProvider({ ...copy, id: `${preset.id}-${Date.now()}` });
                  }}
                >
                  + {preset.name}
                </button>
              ))}
            </div>
            {official.length === 0 ? (
              <p class="rounded-xl border border-dashed border-[rgb(var(--color-border))] px-3 py-4 text-center text-[12px] text-[rgb(var(--color-muted))]">
                No official providers yet. Add one above.
              </p>
            ) : (
              official.map((p) => <ProviderCard key={p.id} provider={p} showProtocol={false} />)
            )}
          </div>
        )}
      </div>

      <div>
        <GroupHeader
          title="Custom Providers"
          count={custom.length}
          open={openCustom}
          onToggle={() => setOpenCustom((v) => !v)}
          action={
            <button
              type="button"
              class="flex items-center gap-1 rounded-lg border border-[rgb(var(--color-border))] px-2.5 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
              onClick={() => void addProvider(newCustomProvider())}
            >
              <IconPlus size={12} />
              New custom
            </button>
          }
        />
        {openCustom && (
          <div class="flex flex-col gap-3">
            <p class="text-[11.5px] text-[rgb(var(--color-muted))]">
              Any OpenAI-compatible or Anthropic-compatible endpoint. Pick the
              protocol per provider; chat, model fetch, and tests follow it.
            </p>
            {custom.length === 0 ? (
              <p class="rounded-xl border border-dashed border-[rgb(var(--color-border))] px-3 py-4 text-center text-[12px] text-[rgb(var(--color-muted))]">
                No custom providers yet. Create one to connect a self-hosted or
                third-party endpoint.
              </p>
            ) : (
              custom.map((p) => <ProviderCard key={p.id} provider={p} showProtocol />)
            )}
          </div>
        )}
      </div>
    </section>
  );
}
