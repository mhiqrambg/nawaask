import { getPageContext } from "@/modules/browser/page-context";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_PAGE_CONTEXT") {
        const context = getPageContext(document);
        sendResponse({ type: "PAGE_CONTEXT_RESULT", payload: context });
        return true;
      }
      return false;
    });
  },
});
