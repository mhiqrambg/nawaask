import type { PageContextResult } from "@/modules/browser/messaging";

const MAX_CHARS = 16000;
const STRIP_TAGS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "select",
];

function textOfNode(node: Node): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Heuristic extraction of readable page content from the live DOM. */
export function extractReadableText(doc: Document): string {
  const body = doc.body;
  if (!body) return "";

  const clone = body.cloneNode(true) as HTMLElement;
  for (const tag of STRIP_TAGS) {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  }
  clone.querySelectorAll("[aria-hidden='true']").forEach((el) => el.remove());

  const article = clone.querySelector("article");
  const main = clone.querySelector("main");
  const root: HTMLElement = article ?? main ?? clone;

  // Score candidate containers by length of textContent vs link density.
  const candidates = Array.from(root.querySelectorAll("p, h1, h2, h3, li"));
  const scored = candidates
    .map((el) => {
      const text = textOfNode(el);
      if (!text) return { el, score: 0 };
      const links = Array.from(el.querySelectorAll("a"));
      const linkLen = links.reduce((acc, a) => acc + textOfNode(a).length, 0);
      const density = linkLen / Math.max(text.length, 1);
      const score = text.length * (1 - Math.min(density, 0.9));
      return { el, score };
    })
    .filter((s) => s.score > 40)
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, 40);
  const lines: string[] = [];
  const seen = new Set<Element>();
  for (const s of selected) {
    if (seen.has(s.el)) continue;
    seen.add(s.el);
    const tag = s.el.tagName.toLowerCase();
    const text = textOfNode(s.el);
    if (!text) continue;
    if (tag === "h1") lines.push(`# ${text}`);
    else if (tag === "h2") lines.push(`## ${text}`);
    else if (tag === "h3") lines.push(`### ${text}`);
    else lines.push(text);
  }

  if (lines.length === 0) {
    const fallback = textOfNode(root);
    return fallback.slice(0, MAX_CHARS);
  }
  return lines.join("\n\n").slice(0, MAX_CHARS);
}

export function getPageContext(doc: Document): PageContextResult {
  const selection = doc.getSelection();
  const selectedText = selection?.toString().trim() ?? "";
  return {
    title: doc.title,
    url: doc.location.href,
    selection: selectedText,
    mainText: extractReadableText(doc),
  };
}
