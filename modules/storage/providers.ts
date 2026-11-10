import type { AIProvider } from "@/modules/ai/types";
import { STORAGE_KEYS } from "@/utils/constants";

/** Stored providers, or empty when the user has none yet. No seeding. */
export async function loadProviders(): Promise<AIProvider[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.providers);
  const value = stored[STORAGE_KEYS.providers];
  if (!Array.isArray(value)) return [];
  return value as AIProvider[];
}

export async function saveProviders(providers: AIProvider[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
}
