import { signal } from "@preact/signals";
import type { PromptTemplate } from "@/modules/prompts/templates";
import { BUILTIN_PROMPTS, loadCustomPrompts, saveCustomPrompts } from "@/modules/prompts/templates";

export const customPrompts = signal<PromptTemplate[]>([]);

export async function initPrompts(): Promise<void> {
  customPrompts.value = await loadCustomPrompts();
}

export function allPromptList(): PromptTemplate[] {
  return [...BUILTIN_PROMPTS, ...customPrompts.value];
}

export async function addCustomPrompt(prompt: PromptTemplate): Promise<void> {
  customPrompts.value = [...customPrompts.value, prompt];
  await saveCustomPrompts(customPrompts.value);
}

export async function updateCustomPrompt(prompt: PromptTemplate): Promise<void> {
  customPrompts.value = customPrompts.value.map((p) => (p.id === prompt.id ? prompt : p));
  await saveCustomPrompts(customPrompts.value);
}

export async function removeCustomPrompt(id: string): Promise<void> {
  customPrompts.value = customPrompts.value.filter((p) => p.id !== id);
  await saveCustomPrompts(customPrompts.value);
}

export function newCustomPrompt(): PromptTemplate {
  return {
    id: crypto.randomUUID(),
    name: "New Prompt",
    template: "{{selection}}",
    builtin: false,
  };
}
