import { signal } from "@preact/signals";
import {
  customPrompts,
  addCustomPrompt,
  updateCustomPrompt,
  removeCustomPrompt,
  newCustomPrompt,
} from "@/composables/usePrompts";
import { BUILTIN_PROMPTS } from "@/modules/prompts/templates";
import type { PromptTemplate } from "@/modules/prompts/templates";

const editingId = signal<string | null>(null);

function renderEditor(prompt: PromptTemplate, builtin: boolean): preact.ComponentChildren {
  if (editingId.value !== prompt.id) return null;
  return (
    <div class="mt-2 flex flex-col gap-2">
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-[rgb(var(--color-muted))]">Name</span>
        <input
          type="text"
          class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
          value={prompt.name}
          disabled={builtin}
          onInput={(e) => {
            const name = (e.currentTarget as HTMLInputElement).value;
            void updateCustomPrompt({ ...prompt, name });
          }}
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-[rgb(var(--color-muted))]">
          Template (supports {"{{selection}}"}, {"{{title}}"}, {"{{page}}"})
        </span>
        <textarea
          class="rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-[12.5px]"
          rows={4}
          value={prompt.template}
          disabled={builtin}
          onInput={(e) => {
            const template = (e.currentTarget as HTMLTextAreaElement).value;
            void updateCustomPrompt({ ...prompt, template });
          }}
        />
      </label>
      {!builtin && (
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded border border-[rgb(var(--color-border))] px-2 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
            onClick={() => {
              void updateCustomPrompt(prompt);
              editingId.value = null;
            }}
          >
            Done
          </button>
          <button
            type="button"
            class="rounded border border-[rgb(var(--color-border))] px-2 py-1 text-[12px] text-red-400 hover:border-red-400"
            onClick={() => {
              void removeCustomPrompt(prompt.id);
              editingId.value = null;
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function PromptsSection() {
  return (
    <section class="flex flex-col gap-4">
      <p class="text-[12px] text-[rgb(var(--color-muted))]">
        Built-in prompts are read-only. Add your own templates below — they will appear in
        chat quick actions.
      </p>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BUILTIN_PROMPTS.map((p) => (
          <article
            key={p.id}
            class="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
          >
            <button
              type="button"
              class="block w-full text-left"
              onClick={() => {
                editingId.value = editingId.value === p.id ? null : p.id;
              }}
            >
              <p class="text-[13px] font-medium">
                {p.icon} {p.name}
              </p>
              <p class="mt-0.5 text-[11px] text-[rgb(var(--color-muted))]" title={p.template}>
                {p.template.slice(0, 90)}…
              </p>
            </button>
            {renderEditor(p, true)}
          </article>
        ))}

        {customPrompts.value.map((p) => (
          <article
            key={p.id}
            class="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
          >
            <button
              type="button"
              class="block w-full text-left"
              onClick={() => {
                editingId.value = editingId.value === p.id ? null : p.id;
              }}
            >
              <p class="text-[13px] font-medium">
                {p.icon} {p.name}
              </p>
              <p class="mt-0.5 text-[11px] text-[rgb(var(--color-muted))]" title={p.template}>
                {p.template.slice(0, 90)}…
              </p>
            </button>
            {renderEditor(p, false)}
          </article>
        ))}
      </div>

      <button
        type="button"
        class="w-fit rounded-lg border border-dashed border-[rgb(var(--color-border))] px-3 py-1.5 text-[12.5px] hover:border-[rgb(var(--color-accent))]"
        onClick={() => {
          const prompt = newCustomPrompt();
          void addCustomPrompt(prompt);
          editingId.value = prompt.id;
        }}
      >
        + New custom prompt
      </button>
    </section>
  );
}
