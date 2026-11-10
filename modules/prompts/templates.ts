import type { SelectionActionId } from "@/modules/browser/messaging";

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  builtin: boolean;
}

/** Template placeholders: {{selection}}, {{title}}, {{url}}, {{page}}. */
export const BUILTIN_PROMPTS: PromptTemplate[] = [
  {
    id: "explain-selection",
    name: "Explain",
    template:
      "Explain the following in simple, clear terms. Use short paragraphs or bullets when helpful.\n\nContext: {{title}}\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "summarize-selection",
    name: "Summarize",
    template: "Summarize the following in 3-5 concise bullet points.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "translate-selection",
    name: "Translate",
    template:
      "Translate the following text into {{language}}. Preserve tone and technical terms.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "rewrite-selection",
    name: "Rewrite",
    template:
      "Rewrite the following text to be clearer, more concise, and grammatically correct. Keep the original meaning.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "ask-selection",
    name: "Ask AI",
    template:
      "I selected this text from a webpage ({{title}}). Answer any implicit question about it and give helpful context.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "explain-code",
    name: "Explain Code",
    template:
      "Explain what this code does step by step. Point out bugs, edge cases, and possible improvements.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "review-code",
    name: "Review Code",
    template:
      "Act as a senior engineer reviewing this code. List concrete issues (correctness, performance, security, readability) with suggested fixes.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "fix-grammar",
    name: "Fix Grammar",
    template:
      "Fix grammar, spelling and punctuation in the following text. Return only the corrected text.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "generate-ideas",
    name: "Generate Ideas",
    template:
      "Generate 8 diverse, actionable ideas related to the following. Group them by category.\n\n{{selection}}",
    builtin: true,
  },
  {
    id: "summarize-page",
    name: "Summarize Page",
    template:
      "Summarize the current webpage ({{title}}). Give a 5-bullet summary of the main points, then list key takeaways.\n\n{{page}}",
    builtin: true,
  },
  {
    id: "explain-page",
    name: "Explain Page",
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
  vars: { selection?: string; title?: string; url?: string; page?: string; language?: string },
): string {
  return template
    .replace(/\{\{selection\}\}/g, vars.selection ?? "")
    .replace(/\{\{title\}\}/g, vars.title ?? "")
    .replace(/\{\{url\}\}/g, vars.url ?? "")
    .replace(/\{\{page\}\}/g, vars.page ?? "")
    .replace(/\{\{language\}\}/g, vars.language ?? "English");
}

export interface LanguageOption {
  code: string;
  label: string;
}

/** Common targets; "" follows the browser UI language. */
export const TRANSLATION_LANGUAGES: LanguageOption[] = [
  { code: "", label: "System default" },
  { code: "en", label: "English" },
  { code: "id", label: "Indonesian" },
  { code: "ms", label: "Malay" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "hi", label: "Hindi" },
  { code: "nl", label: "Dutch" },
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  id: "Indonesian",
  ms: "Malay",
  zh: "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  ru: "Russian",
  hi: "Hindi",
  nl: "Dutch",
};

/**
 * Resolve a configured code (or "") to a display language name for prompts.
 * Falls back to the browser UI language, then English.
 */
export function resolveTranslationLanguage(configured: string): string {
  const candidates = [configured, browserUILanguage()].filter(Boolean);
  for (const code of candidates) {
    const lower = code.toLowerCase();
    const named = LANGUAGE_NAMES[lower];
    if (named) return named;
    const primary = lower.split("-")[0];
    const primaryNamed = primary ? LANGUAGE_NAMES[primary] : undefined;
    if (primaryNamed) return primaryNamed;
  }
  return "English";
}

function browserUILanguage(): string {
  try {
    const ui = chrome.i18n.getUILanguage();
    if (ui) return ui;
  } catch {
    // outside extension contexts
  }
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en";
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
