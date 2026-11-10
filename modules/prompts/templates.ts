import type { SelectionActionId } from "@/modules/browser/messaging";

export interface PromptTemplate {
  id: string;
  name: string;
  icon: string;
  template: string;
  builtin: boolean;
}

/** Template placeholders: {{selection}}, {{title}}, {{url}}, {{page}}. */
export const BUILTIN_PROMPTS: PromptTemplate[] = [
  {
    id: "explain-selection",
    name: "Explain",
    icon: "💡",
    template:
      "Explain the following in simple, clear terms. Use short paragraphs or bullets when helpful.\n\nContext: {{title}}\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "summarize-selection",
    name: "Summarize",
    icon: "📝",
    template: "Summarize the following in 3-5 concise bullet points.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "translate-selection",
    name: "Translate",
    icon: "🌐",
    template:
      "Translate the following text into English. Preserve tone and technical terms.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "rewrite-selection",
    name: "Rewrite",
    icon: "✏️",
    template:
      "Rewrite the following text to be clearer, more concise, and grammatically correct. Keep the original meaning.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "ask-selection",
    name: "Ask AI",
    icon: "💬",
    template:
      "I selected this text from a webpage ({{title}}). Answer any implicit question about it and give helpful context.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "explain-code",
    name: "Explain Code",
    icon: "🧑‍💻",
    template:
      "Explain what this code does step by step. Point out bugs, edge cases, and possible improvements.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "review-code",
    name: "Review Code",
    icon: "🔍",
    template:
      "Act as a senior engineer reviewing this code. List concrete issues (correctness, performance, security, readability) with suggested fixes.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "fix-grammar",
    name: "Fix Grammar",
    icon: "✅",
    template:
      "Fix grammar, spelling and punctuation in the following text. Return only the corrected text.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "generate-ideas",
    name: "Generate Ideas",
    icon: "🌱",
    template:
      "Generate 8 diverse, actionable ideas related to the following. Group them by category.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "summarize-page",
    name: "Summarize Page",
    icon: "📄",
    template:
      "Summarize the current webpage ({{title}}). Give a 5-bullet summary of the main points, then list key takeaways.\n\n{{page}}",
    builtin: true,
  },
  {
    id: "explain-page",
    name: "Explain Page",
    icon: "ℹ️",
    template:
      "Explain the main content of this webpage ({{title}}). Cover what it is about, key arguments or steps, and why it matters.\n\n{{page}}",
    builtin: true,
  },
];

const SELECTION_ACTION_PROMPT: Record<SelectionActionId, string> = {
  explain: "explain-selection",
  summarize: "summarize-selection",
  translate: "translate-selection",
  rewrite: "rewrite-selection",
  ask: "ask-selection",
};

export function promptForSelectionAction(action: SelectionActionId): PromptTemplate {
  const id = SELECTION_ACTION_PROMPT[action];
  const found = BUILTIN_PROMPTS.find((p) => p.id === id);
  if (found) return found;
  const fallback = BUILTIN_PROMPTS.find((p) => p.id === "ask-selection");
  if (!fallback) throw new Error("Built-in prompts missing");
  return fallback;
}

export function fillPrompt(
  template: string,
  vars: { selection?: string; title?: string; url?: string; page?: string },
): string {
  return template
    .replace(/\{\{selection\}\}/g, vars.selection ?? "")
    .replace(/\{\{title\}\}/g, vars.title ?? "")
    .replace(/\{\{url\}\}/g, vars.url ?? "")
    .replace(/\{\{page\}\}/g, vars.page ?? "");
}

const STORAGE_KEY = "nawa:custom-prompts";

export async function loadCustomPrompts(): Promise<PromptTemplate[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as PromptTemplate[] | undefined;
  if (!Array.isArray(value)) return [];
  return value.filter((p) => typeof p?.id === "string" && typeof p?.template === "string");
}

export async function saveCustomPrompts(prompts: PromptTemplate[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: prompts });
}
