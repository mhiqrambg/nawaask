import { render } from "preact";
import "@/assets/styles/global.css";
import { initSettings } from "@/composables/useSettings";
import { initProviders, defaultProviderId, defaultModelId } from "@/composables/useProviders";
import { initPrompts } from "@/composables/usePrompts";
import {
  currentModel,
  refreshHistory,
  consumePendingAction,
} from "@/composables/useChat";
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
  await consumePendingAction();
  // Actions arriving while the panel is already open (e.g. a second
  // toolbar click) never re-run bootstrap, so consume them live.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "session") return;
    const changed = changes["nawa:pending-action"];
    if (!changed || !changed.newValue) return;
    void consumePendingAction();
  });
}

void bootstrap().finally(() => {
  render(<App />, document.getElementById("root")!);
});
