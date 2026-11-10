import { view, showSettings } from "@/composables/useView";
import ChatContainer from "@/components/chat/ChatContainer";
import HistoryPanel from "@/components/history/HistoryPanel";
import SettingsPanel from "@/components/settings/SettingsPanel";

export default function App() {
  let body: preact.ComponentChildren;
  if (showSettings.value) {
    body = <SettingsPanel />;
  } else if (view.value === "history") {
    body = <HistoryPanel />;
  } else {
    body = <ChatContainer />;
  }

  return (
    <div class="flex h-full flex-col">{body}</div>
  );
}
