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

- `entrypoints/` — MV3 shell: background (menus, side panel, commands),
  content (dependency-free toolbar + page extraction), sidepanel/options/popup.
- `composables/` — Preact-signal state: useChat, useProviders, useSettings,
  usePrompts, useView, useModelSelector.
- `modules/ai/` — Provider-agnostic OpenAI-compatible client, SSE parser,
  presets, strict error mapping (401/404/429).
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

Selection/context-menu actions land in `chrome.storage.session`
(`nawa:pending-action`), consumed once by the sidepanel on open.

## Security boundaries

- Provider API keys: extension storage → `Authorization` header only.
  Never in DOM, content scripts, logs, or the cloud client.
- Page content: untrusted input; system prompt instructs the model to treat
  it as data, never instructions.
- Backend: explicit CORS allowlist, security headers, 1 MiB body cap,
  envelope errors, no stack leaks. See SECURITY.md.
