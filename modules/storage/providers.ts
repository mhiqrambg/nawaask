import type { AIProvider } from "@/modules/ai/types";
import { STORAGE_KEYS } from "@/utils/constants";

/**
 * Ids of the removed built-in preset list (including timestamped copies
 * made from them, e.g. `openai-1730000000000`). Purged once on load so
 * old installs start empty like fresh ones.
 */
const LEGACY_PRESET_IDS: Record<string, true> = {
  openai: true,
  deepseek: true,
  openrouter: true,
  qwen: true,
  kimi: true,
  groq: true,
  together: true,
  ollama: true,
};

function isLegacyPreset(p: AIProvider): boolean {
  if (LEGACY_PRESET_IDS[p.id]) return true;
  return Object.keys(LEGACY_PRESET_IDS).some((id) => p.id.startsWith(`${id}-`));
}

/** Stored providers, or empty when the user has none yet. No seeding. */
export async function loadProviders(): Promise<AIProvider[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.providers);
  const value = stored[STORAGE_KEYS.providers];
  if (!Array.isArray(value)) return [];
  const list = value as AIProvider[];
  if (!list.some(isLegacyPreset)) return list;
  const kept = list.filter((p) => !isLegacyPreset(p));
  await saveProviders(kept);
  return kept;
}

export async function saveProviders(providers: AIProvider[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
}
