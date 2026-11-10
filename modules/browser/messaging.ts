export type SelectionActionId =
  | "explain"
  | "summarize"
  | "translate"
  | "rewrite"
  | "ask";


export interface PageContextResult {
  title: string;
  url: string;
  selection: string;
  mainText: string;
}
