import { getPageContext } from "@/modules/browser/page-context";
import type {
  AskAboutSelectionMessage,
  RegionSelectedResponse,
  RegionSelection,
  SelectionContext,
} from "@/modules/browser/messaging";

/** Ignore accidental one-character selections. */
const MIN_SELECTION_CHARS = 2;
/** Let the browser finish applying the selection before measuring it. */
const SETTLE_MS = 30;
/** Keep the fallback hint visible long enough to read. */
const HINT_MS = 4500;

const PILL_WIDTH = 148;
const PILL_HEIGHT = 32;
const GAP = 8;

interface ActiveSelection extends SelectionContext {
  rect: DOMRect;
}

interface AskResponse {
  delivered?: boolean;
}

let host: HTMLDivElement | null = null;
let active: ActiveSelection | null = null;
let hintTimer: number | undefined;

function ensureHost(): HTMLDivElement {
  if (host) return host;
  host = document.createElement("div");
  host.id = "nawaask-ask-host";
  host.style.cssText =
    "all:initial;position:fixed;z-index:2147483647;pointer-events:none;display:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      button {
        display: inline-flex; align-items: center; gap: 6px;
        height: 32px; padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        background: #18181b;
        color: #fafafa;
        font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
        cursor: pointer;
        pointer-events: auto;
        white-space: nowrap;
      }
      button:hover { background: #27272a; }
      button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
      svg { width: 14px; height: 14px; flex: none; color: #60a5fa; }
      .hint {
        position: fixed; right: 16px; bottom: 16px;
        max-width: 260px; padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        background: #18181b;
        color: #fafafa;
        font: 500 12px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
        pointer-events: none;
      }
    </style>
    <button type="button" aria-label="Ask NawaAsk about the selected text">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 5.7L19.6 9l-5.7 1.9L12 16.6l-1.9-5.7L4.4 9l5.7-1.3L12 2z"/>
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>
      </svg>
      <span>Ask NawaAsk</span>
    </button>
    <div class="hint" role="status" hidden>
      Selection attached. Open the NawaAsk side panel to ask about it.
    </div>`;
  const button = root.querySelector("button");
  button?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void attachSelection();
  });
  (document.documentElement ?? document.body).appendChild(host);
  return host;
}

function hidePill(): void {
  if (host) host.style.display = "none";
  if (hintTimer !== undefined) {
    window.clearTimeout(hintTimer);
    hintTimer = undefined;
  }
  active = null;
}

function showHint(): void {
  const el = ensureHost();
  const root = el.shadowRoot;
  if (!root) return;
  const button = root.querySelector("button");
  const hint = root.querySelector<HTMLElement>(".hint");
  if (!button || !hint) return;
  button.style.display = "none";
  hint.hidden = false;
  el.style.display = "block";
  if (hintTimer !== undefined) window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintTimer = undefined;
    hidePill();
  }, HINT_MS);
}

function currentSelection(): ActiveSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const text = selection.toString().trim();
  if (text.length < MIN_SELECTION_CHARS) return null;

  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects()).filter(
    (r) => r.width > 0 && r.height > 0,
  );
  const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const url = location.href;
  return {
    text,
    title: document.title,
    url,
    rect,
  };
}

function showPill(selection: ActiveSelection): void {
  const el = ensureHost();
  const root = el.shadowRoot;
  if (!root) return;
  const button = root.querySelector<HTMLElement>("button");
  const hint = root.querySelector<HTMLElement>(".hint");
  if (!button || !hint) return;
  button.style.display = "";
  hint.hidden = true;
  hintTimer = undefined;

  const { rect } = selection;
  let left = rect.left + rect.width / 2 - PILL_WIDTH / 2;
  left = Math.min(Math.max(GAP, left), window.innerWidth - PILL_WIDTH - GAP);
  let top = rect.bottom + GAP;
  if (top + PILL_HEIGHT > window.innerHeight - GAP) {
    top = Math.max(GAP, rect.top - PILL_HEIGHT - GAP);
  }

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.display = "block";

  active = {
    text: selection.text,
    title: selection.title,
    url: selection.url,
    rect,
  };
}

async function attachSelection(): Promise<void> {
  const selection = active;
  // Hide before sending so a double click cannot attach twice.
  hidePill();
  if (!selection) return;

  const message: AskAboutSelectionMessage = {
    type: "ASK_ABOUT_SELECTION",
    payload: {
      text: selection.text,
      title: selection.title,
      url: selection.url,
    },
  };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as AskResponse | undefined;
    // A page click cannot open the side panel, so the selection is kept in
    // session storage and consumed when the user opens the panel.
    if (response?.delivered === false) showHint();
  } catch {
    // Extension reloaded; this script is orphaned until page refresh.
  }
}

/** Ignore accidental clicks; a click without a real drag cancels. */
const MIN_REGION_SIZE = 8;

let regionHost: HTMLDivElement | null = null;

interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Dim the page and let the user drag a rectangle. The overlay hides itself
 * before responding, so the panel's capture never sees it in the screenshot.
 */
function startRegionSelection(
  sendResponse: (response: RegionSelectedResponse) => void,
): void {
  if (regionHost) {
    sendResponse({ ok: false, cancelled: true });
    return;
  }

  hidePill();

  const el = document.createElement("div");
  el.id = "nawaask-region-host";
  el.style.cssText =
    "all:initial;position:fixed;inset:0;z-index:2147483647;display:block;";
  const root = el.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .layer {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.32);
        cursor: crosshair;
      }
      .layer.dragging { background: transparent; }
      .box {
        position: fixed;
        border: 1.5px solid #60a5fa;
        background: rgba(96, 165, 250, 0.12);
        box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
        pointer-events: none;
      }
      .box[hidden], .size[hidden] { display: none; }
      .size {
        position: fixed;
        padding: 4px 7px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        background: #18181b;
        color: #fafafa;
        font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
        white-space: nowrap;
      }
      .hint {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        padding: 9px 14px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: #18181b;
        color: #fafafa;
        font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
        pointer-events: none;
        white-space: nowrap;
      }
    </style>
    <div class="layer">
      <div class="box" hidden></div>
      <div class="size" hidden></div>
    </div>
    <div class="hint">Drag to select an area · Esc to cancel</div>`;

  const layer = root.querySelector<HTMLElement>(".layer");
  const box = root.querySelector<HTMLElement>(".box");
  const size = root.querySelector<HTMLElement>(".size");
  if (!layer || !box || !size) {
    sendResponse({ ok: false, cancelled: true });
    return;
  }

  regionHost = el;
  (document.documentElement ?? document.body).appendChild(el);

  let responded = false;
  let settled = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let rect: RegionRect = { x: 0, y: 0, width: 0, height: 0 };

  const respond = (response: RegionSelectedResponse): void => {
    if (responded) return;
    responded = true;
    el.remove();
    if (regionHost === el) regionHost = null;
    window.removeEventListener("keydown", onKeyDown, true);
    sendResponse(response);
  };

  const cancel = (): void => {
    if (settled) return;
    settled = true;
    respond({ ok: false, cancelled: true });
  };

  const paint = (): void => {
    box.style.left = `${rect.x}px`;
    box.style.top = `${rect.y}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    size.style.left = `${Math.max(8, rect.x)}px`;
    size.style.top =
      rect.y > 30
        ? `${rect.y - 26}px`
        : `${Math.min(window.innerHeight - 28, rect.y + rect.height + 8)}px`;
  };

  const finish = async (): Promise<void> => {
    settled = true;
    // Hide first and let the page repaint, so the panel's capture
    // (which runs after this response arrives) never sees the overlay.
    el.style.display = "none";
    await nextPaint();
    await new Promise((resolve) => setTimeout(resolve, 50));
    respond({
      ok: true,
      region: {
        ...rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        title: document.title,
        url: location.href,
      },
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
  };

  el.addEventListener("pointerdown", (event) => {
    if (settled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    rect = { x: startX, y: startY, width: 0, height: 0 };
    layer.classList.add("dragging");
    box.hidden = false;
    size.hidden = false;
    paint();
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture is best-effort
    }
  });

  el.addEventListener("pointermove", (event) => {
    if (!dragging || settled) return;
    event.preventDefault();
    event.stopPropagation();
    const right = Math.min(window.innerWidth, Math.max(startX, event.clientX));
    const bottom = Math.min(window.innerHeight, Math.max(startY, event.clientY));
    const left = Math.max(0, Math.min(startX, event.clientX));
    const top = Math.max(0, Math.min(startY, event.clientY));
    rect = { x: left, y: top, width: right - left, height: bottom - top };
    paint();
  });

  el.addEventListener("pointerup", (event) => {
    if (!dragging || settled) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = false;
    if (rect.width < MIN_REGION_SIZE || rect.height < MIN_REGION_SIZE) {
      cancel();
      return;
    }
    void finish();
  });

  el.addEventListener("pointercancel", cancel);
  el.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    cancel();
  });
  el.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    { passive: false },
  );
  window.addEventListener("keydown", onKeyDown, true);
}

let settleTimer: number | undefined;

function scheduleSync(): void {
  if (settleTimer !== undefined) window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    const selection = currentSelection();
    if (!selection) {
      hidePill();
      return;
    }
    showPill(selection);
  }, SETTLE_MS);
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    document.addEventListener("mouseup", (event) => {
      if (event.button !== 0) return;
      scheduleSync();
    });
    document.addEventListener("keyup", (event) => {
      if (!event.shiftKey && !event.key.startsWith("Arrow")) return;
      scheduleSync();
    });

    // Clicking anywhere else dismisses the pill or hint.
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!host) return;
        if (event.composedPath().includes(host)) return;
        hidePill();
      },
      true,
    );

    window.addEventListener("scroll", hidePill, true);
    window.addEventListener("resize", hidePill);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hidePill();
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_PAGE_CONTEXT") {
        const context = getPageContext(document);
        sendResponse({ type: "PAGE_CONTEXT_RESULT", payload: context });
        return true;
      }
      if (message?.type === "START_REGION_CAPTURE") {
        startRegionSelection(sendResponse);
        return true;
      }
      return false;
    });
  },
});
