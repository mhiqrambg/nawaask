import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Render markdown to a sanitized, syntax-highlighted HTML string. */
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  const clean = DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["input"],
    FORBID_TAGS: ["style", "iframe", "object", "embed"],
  });

  // Highlight code blocks inside the sanitized tree.
  const tmp = document.createElement("div");
  tmp.innerHTML = clean;
  tmp.querySelectorAll("pre code").forEach((el) => {
    const code = el.textContent ?? "";
    try {
      const langMatch = el.className.match(/language-([\w-]+)/);
      const lang = langMatch?.[1] ?? "";
      if (lang && hljs.getLanguage(lang)) {
        el.innerHTML = hljs.highlight(code, { language: lang }).value;
      } else {
        el.innerHTML = hljs.highlightAuto(code).value;
      }
    } catch {
      // leave unhighlighted on failure
    }
  });
  return tmp.innerHTML;
}
