import type { SelectionActionId } from "@/modules/browser/messaging";
import { getPageContext } from "@/modules/browser/page-context";

const TOOLBAR_ID = "nawa-ask-toolbar";
const ACTIONS: { id: SelectionActionId; label: string }[] = [
  { id: "explain", label: "Explain" },
  { id: "summarize", label: "Summarize" },
  { id: "translate", label: "Translate" },
  { id: "rewrite", label: "Rewrite" },
  { id: "ask", label: "Ask AI" },
];

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let showFloatingToolbar = true;

    function hideToolbar(): void {
      document.getElementById(TOOLBAR_ID)?.remove();
    }

    function positionToolbar(rect: DOMRect): void {
      const toolbar = document.getElementById(TOOLBAR_ID);
      if (!toolbar) return;
      const toolbarWidth = toolbar.offsetWidth || 260;
      const toolbarHeight = toolbar.offsetHeight || 40;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const left = Math.min(
        Math.max(8, rect.left + scrollX),
        document.documentElement.clientWidth - toolbarWidth - 8,
      );
      const top = Math.max(8, rect.top + scrollY - toolbarHeight - 8);
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${top}px`;
    }

    function showToolbar(selectionRect: DOMRect): void {
      if (!showFloatingToolbar) return;
      if (document.getElementById(TOOLBAR_ID)) return;

      const toolbar = document.createElement("div");
      toolbar.id = TOOLBAR_ID;
      toolbar.setAttribute("role", "toolbar");
      toolbar.setAttribute("aria-label", "NawaAsk selection actions");
      toolbar.style.position = "absolute";
      toolbar.style.zIndex = "2147483647";
      toolbar.style.display = "flex";
      toolbar.style.gap = "4px";
      toolbar.style.padding = "6px 8px";
      toolbar.style.background = "#1f2937";
      toolbar.style.color = "#f9fafb";
      toolbar.style.borderRadius = "10px";
      toolbar.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      toolbar.style.fontFamily = "system-ui, sans-serif";
      toolbar.style.fontSize = "13px";

      for (const action of ACTIONS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.dataset.action = action.id;
        btn.style.background = "transparent";
        btn.style.border = "none";
        btn.style.color = "inherit";
        btn.style.padding = "4px 8px";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";
        btn.addEventListener("mouseenter", () => {
          btn.style.background = "#374151";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.background = "transparent";
        });
        btn.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const text = window.getSelection()?.toString().trim() ?? "";
          if (!text) return;
          void chrome.runtime.sendMessage({
            type: "SELECTION_ACTION",
            payload: {
              action: action.id,
              text,
              title: document.title,
              url: location.href,
            },
          });
          hideToolbar();
        });
        toolbar.appendChild(btn);
      }

      document.body.appendChild(toolbar);
      positionToolbar(selectionRect);
    }

    function getSelectionRect(): DOMRect | null {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      if (!text) return null;
      return range.getBoundingClientRect();
    }

    document.addEventListener("mouseup", () => {
      window.setTimeout(() => {
        const rect = getSelectionRect();
        if (rect) showToolbar(rect);
        else hideToolbar();
      }, 0);
    });

    document.addEventListener("mousedown", (event) => {
      const target = event.target as Node;
      const toolbar = document.getElementById(TOOLBAR_ID);
      if (toolbar && target instanceof Node && toolbar.contains(target)) return;
      hideToolbar();
    });

    document.addEventListener("selectionchange", () => {
      if (!getSelectionRect()) hideToolbar();
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_PAGE_CONTEXT") {
        const context = getPageContext(document);
        sendResponse({ type: "PAGE_CONTEXT_RESULT", payload: context });
        return true;
      }
      return false;
    });

    chrome.storage.onChanged.addListener((changes) => {
      const changed: unknown = changes["nawa:settings"];
      if (changed && typeof changed === "object" && "newValue" in changed) {
        const nv: unknown = changed.newValue;
        const enabled =
          nv && typeof nv === "object" && "showFloatingToolbar" in nv
            ? nv.showFloatingToolbar !== false
            : true;
        showFloatingToolbar = enabled;
        if (!showFloatingToolbar) hideToolbar();
      }
    });

    void chrome.storage.local
      .get("nawa:settings")
      .then((stored) => {
        const raw: unknown = stored["nawa:settings"];
        if (raw && typeof raw === "object" && "showFloatingToolbar" in raw) {
          showFloatingToolbar = raw.showFloatingToolbar !== false;
        }
      })
      .catch(() => {
        // default to enabled
      });
  },
});
