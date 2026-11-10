import type { AIProvider } from "@/modules/ai/types";
import { PROVIDER_PRESETS } from "@/modules/ai/provider-presets";
import { STORAGE_KEYS } from "@/utils/constants";

export function cloneProviders(list: AIProvider[]): AIProvider[] {
  return list.map((p) => ({ ...p, models: p.models.map((m) => ({ ...m })) }));
}

export async function loadProviders(): Promise<AIProvider[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.providers);
  const value = stored[STORAGE_KEYS.providers];
  if (!Array.isArray(value) || value.length === 0) {
    const seeded = cloneProviders(PROVIDER_PRESETS);
    await saveProviders(seeded);
    return seeded;
  }
  return value as AIProvider[];
}

export async function saveProviders(providers: AIProvider[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
}
