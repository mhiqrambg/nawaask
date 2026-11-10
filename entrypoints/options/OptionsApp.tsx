import { useState } from "preact/hooks";
import ProvidersSection from "@/components/options/ProvidersSection";
import PromptsSection from "@/components/options/PromptsSection";
import GeneralSection from "@/components/options/GeneralSection";

type Tab = "providers" | "prompts" | "general";

const TABS: { id: Tab; label: string }[] = [
  { id: "providers", label: "Providers" },
  { id: "prompts", label: "Prompts" },
  { id: "general", label: "General" },
];

export default function OptionsApp() {
  const [tab, setTab] = useState<Tab>("providers");

  return (
    <div class="mx-auto max-w-3xl p-6">
      <header class="mb-4 flex items-center gap-3">
        <h1 class="text-xl font-semibold">NawaAsk Settings</h1>
      </header>
      <nav class="mb-4 flex gap-1 border-b border-[rgb(var(--color-border))] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            class={`rounded-lg px-3 py-1.5 text-[13px] ${
              tab === t.id
                ? "bg-[rgb(var(--color-accent))]/15 text-[rgb(var(--color-accent))]"
                : "text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-surface))]"
            }`}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "providers" && <ProvidersSection />}
      {tab === "prompts" && <PromptsSection />}
      {tab === "general" && <GeneralSection />}
    </div>
  );
}
