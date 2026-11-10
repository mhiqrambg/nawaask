# NawaAsk — Your AI, Anywhere on the Web

Lightweight Chrome (MV3) AI assistant. Chat in the side panel, ask about selected
text via a floating toolbar, summarize pages, and connect any OpenAI-compatible
provider. Built with Bun + WXT + Preact + TypeScript. No React.

## Quick start

```bash
bun install
bun run dev        # loads unpacked extension, hot reload
```

Production:

```bash
bun run build      # output in .output/chrome-mv3/
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked →
select `.output/chrome-mv3/`.

Other commands: `bun run compile` (typecheck), `bun run zip` (store package).

## Configure a provider

1. Open the side panel → gear icon, or extension Options page.
2. Pick a provider tab (OpenAI, DeepSeek, OpenRouter, Qwen, Kimi, Groq,
   Together AI, Ollama, Custom).
3. Paste Base URL (must include `/v1` path where required) and API key.
4. Click **Test connection**, then **Fetch from API** to pull `/models`,
   or add a model ID manually.
5. Set default provider + model.

Request shape sent to `{baseUrl}/chat/completions`:

```json
{ "model": "model-id", "messages": [], "stream": true, "temperature": 0.7 }
```

Streaming uses SSE parsing with `[DONE]` termination; AbortController cancels
generation. 401/404/429 map to human-readable errors.

### Provider notes

- **Ollama** runs at `http://localhost:11434/v1` (placeholder key `ollama`).
  Chrome may block `localhost` subresources from `chrome-extension://` pages;
  if Test fails, run Chrome with `--allow-insecure-localhost` or use a tunnel.
- **Qwen (DashScope)** uses `/compatible-mode/v1`, which speaks OpenAI protocol.
- **OpenRouter** may require `HTTP-Referer`/`X-Title` headers for some keys;
  not sent by default — add a Custom provider entry if needed.

## Features

- Side-panel chat: streaming markdown + code highlight, copy, regenerate, stop,
  auto-scroll, suggested prompts, model switcher.
- Select text → floating toolbar (Explain / Summarize / Translate / Rewrite /
  Ask). Toggle in Settings → General.
- Right-click menu: same actions + Summarize page.
- `Ctrl+Shift+K` / `Cmd+Shift+K` opens the panel.
- History: IndexedDB persistence, search, pin, rename, export `.md`.
- Prompt library: 11 built-ins + custom templates
  (`{{selection}}`, `{{title}}`, `{{url}}`, `{{page}}`).
- Themes: light / dark / system.

## Privacy

- API keys live in `chrome.storage.local` on this device only, sent only to the
  configured provider base URL. Chrome storage is **not encrypted** — anyone
  with profile access can read it.
- Page content is extracted only on explicit action (toolbar click, context
  menu, "summarize this page"). Page text is treated as untrusted data:
  system prompt instructs the model not to follow instructions inside it.
- Content scripts never see keys; keys never touch page DOM.

## Project layout

```
entrypoints/  background.ts (menus, side panel, commands)
              content.ts (selection toolbar, page extraction)
              sidepanel/ options/ popup/
components/   chat/ sidebar/ providers/ history/ options/ settings/ ui/
composables/  useChat / useProviders / useSettings / usePrompts /
              useView / useModelSelector (Preact signals)
modules/      ai/ (client, streaming SSE, presets, types)
              browser/ (messaging types, page-context)
              storage/ (settings, providers, IndexedDB conversations)
              prompts/ (templates, system prompts)
utils/        markdown (marked+DOMPurify+highlight.js), errors, constants
```

Content script is dependency-free DOM code (no Preact) to stay light.

## Known limitations

- `highlight.js/lib/common` (~40 languages) dominates the sidepanel bundle
  (~250 KB). Swap for a smaller subset if size matters.
- Rename uses a native `prompt()` dialog (functional MVP).
- No attachment support yet (button is a disabled placeholder).
- Firefox: `bun run build:firefox`; sidePanel API needs Firefox 142+.
