export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  defaultProviderId: string;
  defaultModelId: string;
  language: string;
  enterToSend: boolean;
  autoScroll: boolean;
  showFloatingToolbar: boolean;
  includePageContext: boolean;
  contextCharLimit: number;
  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultProviderId: "openai",
  defaultModelId: "gpt-4o-mini",
  language: "en",
  enterToSend: true,
  autoScroll: true,
  showFloatingToolbar: true,
  includePageContext: true,
  contextCharLimit: 12000,
  theme: "system",
};

const SETTINGS_KEY = "nawa:settings";

export async function loadSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const value = stored[SETTINGS_KEY] as Partial<AppSettings> | undefined;
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...value };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

/** Persist a single key atomically using current stored value as base. */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<AppSettings> {
  const current = await loadSettings();
  const next: AppSettings = { ...current, [key]: value };
  await saveSettings(next);
  return next;
}

export function applyTheme(theme: ThemeMode, doc: Document = document): void {
  const root = doc.documentElement;
  const resolve =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.classList.toggle("dark", resolve === "dark");
  root.dataset.theme = resolve;
}
