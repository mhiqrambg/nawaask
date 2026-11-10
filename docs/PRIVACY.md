# NawaAsk Privacy

## BYOK mode (default)

- **Conversations** stay in IndexedDB on your device. Nothing is uploaded.
- **Provider API keys** stay in `chrome.storage.local`, sent only to the
  provider base URL you configured. Chrome storage is not encrypted; anyone
  with access to your browser profile can read it.
- **Page content** is extracted only on your explicit action (Ask pill click,
  page attach, "summarize this page"). We send the minimum readable text,
  never the raw DOM, scripts, or credentials. Page text is treated as
  untrusted data (see SECURITY.md).
- **NawaAsk servers**: zero requests. There is nothing to opt out of.

## Cloud mode (optional)

- Only active when you build/select it with a configured endpoint.
- Health/meta checks transmit no personal data (no keys, no page content).
- Future sync features will be opt-in, per-account, and documented here
  before they ship. Sync will never include provider API keys.

## Deletion

- Extension: remove a conversation in History → Delete, or clear all via
  browser profile / extension storage reset. Uninstalling removes everything.
- Cloud: no user data is stored server-side today, so there is nothing to
  delete. This section will gain a retention/deletion policy with the first
  sync feature.
