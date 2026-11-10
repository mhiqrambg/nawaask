import { render } from "preact";
import "@/assets/styles/global.css";
import { initSettings } from "@/composables/useSettings";
import { initProviders, defaultProviderId, defaultModelId } from "@/composables/useProviders";
import { initPrompts } from "@/composables/usePrompts";
import {
  currentModel,
  refreshHistory,
  consumeSelectedContext,
} from "@/composables/useChat";
import { SELECTION_STORAGE_KEY } from "@/modules/browser/messaging";
import App from "./App";

async function bootstrap(): Promise<void> {
  await Promise.all([initSettings(), initProviders(), initPrompts()]);
  await refreshHistory();
  if (defaultProviderId.value && defaultModelId.value) {
    currentModel.value = {
      providerId: defaultProviderId.value,
      modelId: defaultModelId.value,
    };
  }
  await consumeSelectedContext();
  // Selections arriving while the panel is already open never re-run
  // bootstrap, so consume them live from storage changes.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "session") return;
    const changed = changes[SELECTION_STORAGE_KEY];
    if (!changed || !changed.newValue) return;
    void consumeSelectedContext();
  });

  // Tells the background that a panel is live, so the page pill knows whether
  // the selection will appear immediately or needs the open-panel hint.
  let closing = false;
  window.addEventListener("pagehide", () => {
    closing = true;
  });
  const connect = (): void => {
    try {
      const port = chrome.runtime.connect({ name: "nawaask-panel" });
      port.onDisconnect.addListener(() => {
        // Service worker restarted while the panel stayed open: reconnect.
        if (!closing) window.setTimeout(connect, 500);
      });
    } catch {
      // Extension context invalidated; nothing to keep alive.
    }
  };
  connect();
}

void bootstrap().finally(() => {
  render(<App />, document.getElementById("root")!);
});
