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
    void (async () => {
      const tabId = tab?.id;
      if (tabId === undefined) return;
      const rawId = info.menuItemId;
      const action = typeof rawId === "string" ? rawId.replace("nawaask-", "") : "";
      if (action === "summarize-page") {
        await chrome.sidePanel.open({ tabId });
        await chrome.storage.session.set({
          "nawa:pending-action": {
            action: "summarize-page" as const,
            text: "",
            title: tab?.title ?? "",
            url: tab?.url ?? "",
          },
        });
        return;
      }
      if (!(MENU_IDS as readonly string[]).includes(action)) return;
      await chrome.sidePanel.open({ tabId });
      await chrome.storage.session.set({
        "nawa:pending-action": {
          action,
          text: info.selectionText ?? "",
          title: tab?.title ?? "",
          url: tab?.url ?? "",
        },
      });
    })();
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
    if (message?.type === "SELECTION_ACTION" && tabId !== undefined) {
      void chrome.storage.session
        .set({ "nawa:pending-action": message.payload })
        .then(() => chrome.sidePanel.open({ tabId }))
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });
});
