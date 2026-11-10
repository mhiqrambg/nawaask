# NawaAsk Architecture

## Modes

NawaAsk runs in one of two modes (`NawaAskMode` in `modules/cloud/types.ts`):

- **BYOK (default)** — Extension talks directly to the user's AI provider.
  No backend, no account, no server. Conversations in IndexedDB, settings in
  `chrome.storage.local`. Works after install with zero infrastructure.
- **Cloud (optional, future)** — Authenticated features served by the Hono
  backend in `backend/` (Cloudflare Workers). Currently only health/meta
  discovery is implemented; every capability flag in `/api/v1/meta` is `false`.

```
MODE BYOK (default, always available)
  sidepanel/popup/options → modules/ai/client.ts → user provider (/chat/completions, SSE)
  storage: IndexedDB (conversations) + chrome.storage (settings/providers/prompts)

MODE CLOUD (only when VITE_NAWAASK_CLOUD_API_BASE_URL is set)
  options → modules/cloud/client.ts → GET /api/v1/health, /api/v1/meta
  (future: auth → sync → gateway; all behind capability flags)
```

## Extension layers

- `entrypoints/` — MV3 shell: background (side panel, selection relay,
  commands), content (dependency-free Ask pill + page extraction),
  sidepanel/options/popup.
- `composables/` — Preact-signal state: useChat, useProviders, useSettings,
  usePrompts, useView, useModelSelector.
- `modules/ai/` — Provider client (OpenAI-compatible + Anthropic Messages
  protocols), SSE parsers, strict error mapping (401/404/429).
- `modules/browser/` — Typed cross-context contracts, readable-text extraction.
- `modules/storage/` — chrome.storage wrappers + IndexedDB conversation store.
- `modules/prompts/` — Built-in + custom templates with `{{selection}}`,
  `{{title}}`, `{{url}}`, `{{page}}` placeholders.
- `modules/cloud/` — Optional backend client. Throws `not-configured`
  before any network call when no base URL is set. BYOK code never imports it
  on hot paths.

## Data flow (chat)

```
user input → useChat.sendMessage → AIClient.chatStream → SSE deltas
→ messages signal → ChatMessage (marked → DOMPurify → highlight.js)
→ persistInto (IndexedDB) + refreshHistory
```

Selected text flow:

```
select text → "Ask NawaAsk" pill click (never automatic)
→ ASK_ABOUT_SELECTION → background stores it in chrome.storage.session
  (nawa:selected-context) and reports whether a panel is live
→ sidepanel consumes it once into a composer context card (title/URL, remove)
→ user types a question + Send:
  Context / User Question / Instruction block → AIClient.chatStream
```

Selection never opens the panel by itself (page clicks carry no extension
gesture) and never sends a request. The context is cleared on submit, so it
cannot leak into later questions.

## Security boundaries

- Provider API keys: extension storage → `Authorization` header only.
  Never in DOM, content scripts, logs, or the cloud client.
- Page content: untrusted input; system prompt instructs the model to treat
  it as data, never instructions.
- Backend: explicit CORS allowlist, security headers, 1 MiB body cap,
  envelope errors, no stack leaks. See SECURITY.md.
