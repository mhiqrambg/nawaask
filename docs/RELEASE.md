# NawaAsk Release Checklist

## Extension (Chrome Web Store)

```bash
bun install
bun run compile      # must be clean
bun run build        # .output/chrome-mv3/
bun run zip          # .output/nawaask-<version>-chrome.zip → upload
```

1. Bump `version` in `package.json` (WXT syncs it into the manifest).
2. Confirm `wxt.config.ts` permissions — no additions without a reason.
3. Smoke test (see README): chat streaming, Ask pill context, region-select
   screenshot capture + preview, history persist across restart, themes,
   bad-key error.
4. Upload the ZIP to the Web Store dashboard; note the assigned extension
   ID for the backend allowlist.

## Backend (Cloudflare Workers)

```bash
cd backend
bun install
bun test             # must be 8/8
bunx tsc --noEmit    # must be clean
bun run deploy
```

1. Set `vars.APP_ENV=production` and `ALLOWED_ORIGINS` (store extension ID).
2. No secrets in config; provision via `wrangler secret put`.
3. Verify after deploy:
   ```bash
   curl https://<worker>/health
   curl https://<worker>/api/v1/health
   curl https://<worker>/api/v1/meta
   ```
   All `{"success":true,...}`; `meta.features.*` all `false` for now.

## Cloud-enabled extension build (optional)

Only after the backend is deployed and allowlisted:

```bash
VITE_NAWAASK_CLOUD_API_BASE_URL=https://<worker> bun run build
```

Default release builds leave the variable empty (BYOK-only).
