import { signal } from "@preact/signals";
import type { AIProvider, AIModel } from "@/modules/ai/types";
import { AIClient } from "@/modules/ai/client";
import { loadProviders, saveProviders } from "@/modules/storage/providers";

export const providers = signal<AIProvider[]>([]);
export const defaultProviderId = signal<string>("");
export const defaultModelId = signal<string>("");

export async function initProviders(): Promise<void> {
  try {
    providers.value = await loadProviders();
  } catch {
    providers.value = [];
  }
  try {
    await readDefaults();
  } catch {
    // keep signal defaults; settings load is best-effort here
  }
}

async function readDefaults(): Promise<void> {
  const settings = await chrome.storage.local.get("nawa:settings");
  const s: unknown = settings["nawa:settings"];
  if (s && typeof s === "object") {
    if ("defaultProviderId" in s && typeof s.defaultProviderId === "string") {
      defaultProviderId.value = s.defaultProviderId;
    }
    if ("defaultModelId" in s && typeof s.defaultModelId === "string") {
      defaultModelId.value = s.defaultModelId;
    }
  }
}

export async function updateProvider(updated: AIProvider): Promise<void> {
  providers.value = providers.value.map((p) => (p.id === updated.id ? updated : p));
  await saveProviders(providers.value);
}

export async function addProvider(provider: AIProvider): Promise<void> {
  providers.value = [...providers.value, provider];
  await saveProviders(providers.value);
}

export async function toggleProviderEnabled(id: string, enabled: boolean): Promise<void> {
  providers.value = providers.value.map((p) => (p.id === id ? { ...p, enabled } : p));
  await saveProviders(providers.value);
}

export async function removeProvider(id: string): Promise<void> {
  providers.value = providers.value.filter((p) => p.id !== id);
  await saveProviders(providers.value);
}

/** A fresh card is one still holding the example URL with no API key. */
export function hasUnfinishedProvider(): boolean {
  return providers.value.some(
    (p) => !p.apiKey.trim() && p.baseUrl === "https://api.example.com/v1",
  );
}
export function newCustomProvider(): AIProvider {
  return {
    id: crypto.randomUUID(),
    name: "Custom",
    baseUrl: "https://api.example.com/v1",
    apiKey: "",
    enabled: true,
    protocol: "openai",
    custom: true,
    models: [{ id: "custom-model", name: "Custom Model", supportsStreaming: true }],
    defaultModel: "custom-model",
  };
}

export async function testProvider(provider: AIProvider): Promise<string> {
  const client = new AIClient(provider);
  const models = await client.listModels();
  if (models.length === 0) return "Connection OK, but no models returned.";
  return `Connection OK. ${models.length} models available.`;
}

export async function refreshModels(providerId: string): Promise<string[]> {
  const provider = providers.value.find((p) => p.id === providerId);
  if (!provider) return [];
  const client = new AIClient(provider);
  const ids = await client.listModels();
  const models: AIModel[] = ids.map((id) => ({
    id,
    name: id,
    supportsStreaming: true,
  }));
  providers.value = providers.value.map((p) =>
    p.id === providerId ? { ...p, models } : p,
  );
  await saveProviders(providers.value);
  return ids;
}

export async function setDefault(providerId: string, modelId: string): Promise<void> {
  defaultProviderId.value = providerId;
  defaultModelId.value = modelId;
  const stored = await chrome.storage.local.get("nawa:settings");
  const s = stored["nawa:settings"] ?? {};
  await chrome.storage.local.set({
    "nawa:settings": { ...s, defaultProviderId: providerId, defaultModelId: modelId },
  });
}

export function getModelLabel(providerId: string, modelId: string): string {
  const p = providers.value.find((x) => x.id === providerId);
  if (!p) return modelId;
  return `${p.name} · ${p.models.find((m) => m.id === modelId)?.name ?? modelId}`;
}
