
export interface PageContextResult {
  title: string;
  url: string;
  selection: string;
  mainText: string;
}

/** Text the user explicitly chose to ask about, plus its page source. */
export interface SelectionContext {
  text: string;
  title: string;
  url: string;
}

/** Content script → background: user clicked "Ask NawaAsk" on a selection. */
export interface AskAboutSelectionMessage {
  type: "ASK_ABOUT_SELECTION";
  payload: SelectionContext;
}

/** Session-storage key holding the selection until the panel consumes it. */
export const SELECTION_STORAGE_KEY = "nawa:selected-context";

/** Viewport-relative CSS-pixel rect picked by the user on the page. */
export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  title: string;
  url: string;
}

/** Side panel → content script: show the drag-to-select overlay. */
export interface StartRegionCaptureMessage {
  type: "START_REGION_CAPTURE";
}


/**
 * Content script → side panel: the user finished a drag selection.
 * The panel captures and crops, so the overlay hides before pixels are read.
 */
export type RegionSelectedResponse =
  | { ok: true; region: RegionSelection }
  | { ok: false; cancelled: true };
