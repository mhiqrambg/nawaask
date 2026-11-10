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
