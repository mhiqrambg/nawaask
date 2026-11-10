export default defineBackground(() => {
  const MENU_IDS = ["explain", "summarize", "translate", "rewrite", "ask"] as const;

  chrome.runtime.onInstalled.addListener(() => {
    registerMenus();
  });

  function registerMenus(): void {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "nawaask-root",
        title: "NawaAsk",
        contexts: ["selection", "page"],
      });
      const labels: Record<(typeof MENU_IDS)[number], string> = {
        explain: "Explain selected text",
        summarize: "Summarize selected text",
        translate: "Translate selected text",
        rewrite: "Rewrite selected text",
        ask: "Ask AI about this",
      };
      for (const id of MENU_IDS) {
        chrome.contextMenus.create({
          id: `nawaask-${id}`,
          parentId: "nawaask-root",
          title: labels[id],
          contexts: ["selection"],
        });
      }
      chrome.contextMenus.create({
        id: "nawaask-summarize-page",
        parentId: "nawaask-root",
        title: "Summarize this page",
        contexts: ["page"],
      });
    });
  }

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const tabId = tab?.id;
    if (tabId === undefined) return;
    // Gesture rule: open() must run synchronously in the handler, before
    // any await. Storage writes follow in the promise chain.
    const opened = chrome.sidePanel.open({ tabId });
    const rawId = info.menuItemId;
    const action = typeof rawId === "string" ? rawId.replace("nawaask-", "") : "";
    if (action !== "summarize-page" && !(MENU_IDS as readonly string[]).includes(action)) {
      return;
    }
    const payload =
      action === "summarize-page"
        ? {
            action: "summarize-page" as const,
            text: "",
            title: tab?.title ?? "",
            url: tab?.url ?? "",
          }
        : {
            action,
            text: info.selectionText ?? "",
            title: tab?.title ?? "",
            url: tab?.url ?? "",
          };
    // Panel and payload are independent: the open call keeps the gesture,
    // the store keeps the action for a manually opened panel.
    void opened.catch(() => {
      // open rejected (e.g. panel disabled); payload below still lands
    });
    void chrome.storage.session
      .set({ "nawa:pending-action": payload })
      .catch(() => {
        // session storage unavailable; nothing to consume later
      });
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    if (message?.type === "OPEN_SIDE_PANEL" && tabId !== undefined) {
      chrome.sidePanel
        .open({ tabId })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });
});
