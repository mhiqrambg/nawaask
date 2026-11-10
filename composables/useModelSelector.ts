import { signal } from "@preact/signals";

export const modelSelectorOpen = signal(false);

export function toggleModelSelector(): void {
  modelSelectorOpen.value = !modelSelectorOpen.value;
}

export function closeModelSelector(): void {
  modelSelectorOpen.value = false;
}
