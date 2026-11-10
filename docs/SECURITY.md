# NawaAsk Security

## Extension

- **Keys never cross the page boundary.** Content scripts are dependency-free
  DOM code with no access to keys; keys live in extension contexts and leave
  only as `Authorization` headers to the configured provider.
- **No key logging.** Errors surface HTTP status + provider message only.
- **Markdown is untrusted.** Rendered via marked → DOMPurify (`style`,
  `iframe`, `object`, `embed` forbidden) → `dangerouslySetInnerHTML`.
- **Page content is untrusted.** System prompt labels it data, not
  instructions; extraction strips scripts/nav/forms and caps length.
- **Least privilege.** Permissions: `sidePanel`, `storage`, `contextMenus`,
  `tabs`, `activeTab`; host `<all_urls>` (required for the toolbar/page
  context); `clipboardWrite` optional. No remote code execution.
- **No secrets in the bundle.** `VITE_*` config carries only the public
  cloud base URL. Provider keys are user-entered at runtime.

## Backend (Hono / Workers)

- **CORS allowlist, explicit origins only.** `ALLOWED_ORIGINS` env;
  unlisted origins get no CORS headers, preflight → 403. No wildcard with
  credentials (no credentials at all currently).
- **Security headers** on every response: `nosniff`, `DENY` framing,
  `no-referrer`, restrictive `Permissions-Policy`, `COOP: same-origin`.
- **Request size cap**: bodies over 1 MiB → 413.
- **Envelope errors**: `{success, data, error{code,message}}`; 500s hide
  internals outside development. No request/response logging.
- **Secrets discipline**: Worker secrets via `wrangler secret put`;
  `.dev.vars` gitignored; placeholders only in `.dev.vars.example`.
- **No fake auth.** There are no auth/sync/subscription endpoints. Do not
  add data endpoints without authentication + authorization review.

## Operations

- Publish least-privilege Cloudflare API tokens for deploys.
- Rotate a secret with `wrangler secret put <NAME>` (no redeploy needed).
- After Chrome Web Store publish, set `ALLOWED_ORIGINS` to the real
  `chrome-extension://<id>` and redeploy; keep dev IDs out of production.
