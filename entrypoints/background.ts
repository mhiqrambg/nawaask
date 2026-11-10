import type { AskAboutSelectionMessage } from "@/modules/browser/messaging";
import { SELECTION_STORAGE_KEY } from "@/modules/browser/messaging";

/** Live side-panel documents; a port disconnects when the panel closes. */
const panelPorts = new Set<chrome.runtime.Port>();

export default defineBackground(() => {
  // Toolbar clicks open the side panel directly (no popup in between).
  // Guarded: the sidePanel API may be absent on older browsers.
  try {
    void chrome.sidePanel
      ?.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => {
        // side panel unavailable; ignore
      });
  } catch {
    // sidePanel namespace missing; ignore
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "nawaask-panel") return;
    panelPorts.add(port);
    port.onDisconnect.addListener(() => panelPorts.delete(port));
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command !== "open-nawaask") return;
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId !== undefined) return chrome.sidePanel.open({ tabId });
      })
      .catch(() => {
        // no active tab; ignore
      });
  });

  // The content script's "Ask NawaAsk" pill was clicked. Page clicks carry no
  // extension gesture, so the panel cannot be opened from here; stash the
  // selection and let the open panel consume it. Never sends a chat request.
  chrome.runtime.onMessage.addListener(
    (message: AskAboutSelectionMessage, sender, sendResponse) => {
      if (message?.type !== "ASK_ABOUT_SELECTION") return false;
      if (sender.tab?.id === undefined) return false;

      const text = typeof message.payload?.text === "string" ? message.payload.text : "";
      if (!text.trim()) return false;

      // Keep the channel open until the write settles: returning false here
      // would let the worker go idle before storage commits.
      void chrome.storage.session
        .set({
          [SELECTION_STORAGE_KEY]: {
            text,
            title: typeof message.payload.title === "string" ? message.payload.title : "",
            url: typeof message.payload.url === "string" ? message.payload.url : "",
          },
        })
        .then(() => {
          sendResponse({ delivered: panelPorts.size > 0 });
        })
        .catch(() => {
          sendResponse({ delivered: false, stored: false });
        });
      return true;
    },
  );
});
