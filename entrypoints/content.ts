import { getPageContext } from "@/modules/browser/page-context";

/** Minimum non-space characters before a selection is treated as intentional. */
const MIN_SELECTION_CHARS = 2;
const DEBOUNCE_MS = 250;

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let lastSent = "";
    let timer: number | undefined;

    function selectedText(): string {
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) return "";
      return s.toString().trim();
    }

    function sendSelection(text: string): void {
      if (text === lastSent) return;
      lastSent = text;
      try {
        chrome.runtime.sendMessage({
          type: "SELECTION_ATTACHED",
          text,
        });
      } catch {
        // extension reloaded; this script is orphaned until page refresh
      }
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_PAGE_CONTEXT") {
        const context = getPageContext(document);
        sendResponse({ type: "PAGE_CONTEXT_RESULT", payload: context });
        return true;
      }
      return false;
    });

    document.addEventListener("selectionchange", () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const text = selectedText();
        if (text.length >= MIN_SELECTION_CHARS) sendSelection(text);
      }, DEBOUNCE_MS);
    });
  },
});
