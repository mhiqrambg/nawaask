import { signal } from "@preact/signals";
import type { AppSettings, ThemeMode } from "@/modules/storage/settings";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  applyTheme,
} from "@/modules/storage/settings";

export const settings = signal<AppSettings>({ ...DEFAULT_SETTINGS });

export async function initSettings(): Promise<void> {
  settings.value = await loadSettings();
  applyTheme(settings.value.theme);
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  settings.value = { ...settings.value, ...patch };
  await saveSettings(settings.value);
  if (patch.theme) applyTheme(patch.theme);
}

export function setTheme(theme: ThemeMode): void {
  void updateSettings({ theme });
}
