import { signal } from "@preact/signals";
import { settings, updateSettings } from "@/composables/useSettings";
import { NawaCloudClient } from "@/modules/cloud/client.ts";
import { cloudBaseUrl, isCloudConfigured } from "@/modules/cloud/config.ts";

const status = signal<string | null>(null);
const checking = signal(false);

async function checkCloud(): Promise<void> {
  checking.value = true;
  status.value = null;
  try {
    const client = new NawaCloudClient();
    const [health, meta] = await Promise.all([client.health(), client.meta()]);
    const enabled = Object.entries(meta.features)
      .filter(([, v]) => v)
      .map(([k]) => k);
    status.value =
      `Reachable (api ${health.version}, env ${health.environment}). ` +
      (enabled.length > 0 ? `Enabled: ${enabled.join(", ")}.` : "All cloud features disabled.");
  } catch (err) {
    status.value = `Unreachable: ${(err as Error)?.message ?? "unknown error"}`;
  } finally {
    checking.value = false;
  }
}

export default function CloudSection() {
  const configured = isCloudConfigured();
  const base = cloudBaseUrl();
  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        {(["byok", "cloud"] as const).map((mode) => {
          const disabled = mode === "cloud" && !configured;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              title={
                disabled
                  ? "Cloud backend URL not configured at build time"
                  : mode === "byok"
                    ? "Direct provider calls, local storage"
                    : "Optional cloud backend (future features)"
              }
              class={`rounded-lg border px-3 py-1.5 ${
                settings.value.mode === mode
                  ? "border-[rgb(var(--color-accent))] text-[rgb(var(--color-accent))]"
                  : "border-[rgb(var(--color-border))]"
              } ${disabled ? "opacity-40" : ""}`}
              onClick={() => void updateSettings({ mode })}
            >
              {mode === "byok" ? "BYOK (default)" : "Cloud"}
            </button>
          );
        })}
      </div>
      <p class="text-[11.5px] text-[rgb(var(--color-muted))]">
        {configured
          ? `Cloud endpoint: ${base}`
          : "No cloud endpoint configured (VITE_NAWAASK_CLOUD_API_BASE_URL). BYOK works fully offline from any backend."}
      </p>
      {configured && (
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-[rgb(var(--color-border))] px-2 py-1 text-[12px] hover:border-[rgb(var(--color-accent))]"
            disabled={checking.value}
            onClick={() => void checkCloud()}
          >
            {checking.value ? "Checking…" : "Check cloud status"}
          </button>
          {status.value && (
            <span class="text-[11.5px] text-[rgb(var(--color-muted))]">{status.value}</span>
          )}
        </div>
      )}
    </div>
  );
}
