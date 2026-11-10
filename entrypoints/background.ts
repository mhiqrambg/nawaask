export default defineBackground(() => {
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

  // Selection on any page: open the panel and attach the selected text.
  // The open() call runs synchronously so the click gesture survives.
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== "SELECTION_ATTACHED") return false;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return false;
    chrome.sidePanel.open({ tabId }).catch(() => {
      // panel may already be open; payload below still lands
    });
    void chrome.storage.session
      .set({
        "nawa:pending-action": {
          action: "custom" as const,
          text: message.text ?? "",
          title: sender.tab?.title ?? "",
          url: sender.tab?.url ?? "",
        },
      })
      .catch(() => {
        // session storage unavailable; nothing to consume later
      });
    return false;
  });
});
