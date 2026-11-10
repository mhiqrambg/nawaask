import { signal } from "@preact/signals";

export type SidePanelView = "chat" | "history";

export const view = signal<SidePanelView>("chat");
export const showHistory = signal(false);
export const showSettings = signal(false);

export function setView(next: SidePanelView): void {
  view.value = next;
}

export function toggleHistory(): void {
  showHistory.value = !showHistory.value;
}

export function setSettingsOpen(next: boolean): void {
  showSettings.value = next;
}
