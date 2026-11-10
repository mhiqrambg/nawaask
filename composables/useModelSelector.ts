import { signal, computed } from "@preact/signals";
import { currentModel } from "./useChat";
import { setDefault } from "./useProviders";
import { settings, updateSettings } from "./useSettings";

export const modelDropdownOpen = signal(false);

export function toggleModelDropdown(): void {
  modelDropdownOpen.value = !modelDropdownOpen.value;
}

export function closeModelDropdown(): void {
  modelDropdownOpen.value = false;
}

export function selectModel(providerId: string, modelId: string): void {
  void setDefault(providerId, modelId);
  currentModel.value = { providerId, modelId };
  closeModelDropdown();
}

export const extendedThinking = computed(
  () => settings.value.extendedThinking ?? false,
);

export function setExtendedThinking(value: boolean): void {
  void updateSettings({ extendedThinking: value });
}
