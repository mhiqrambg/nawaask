# Deploying NawaAsk Cloud (Cloudflare Workers)

Backend lives in `backend/` (Hono + TypeScript, Bun for scripts).
Extension builds never depend on it.

## Prerequisites

1. Cloudflare account.
2. Bun installed.
3. Wrangler (already a devDependency):
   ```bash
   cd backend
   bun install
   bunx wrangler login
   ```

## Local development

```bash
cd backend
bun install
bun run dev        # wrangler dev, http://localhost:8787
bun test           # 8 unit tests via app.request
bunx wrangler types  # regenerate worker-configuration.d.ts when bindings change
```

Local secrets (CORS origins for dev extension, future keys):

```bash
cp .dev.vars.example .dev.vars   # gitignored; edit placeholders
```

## Configure

`backend/wrangler.jsonc`:

- `name`, `main: src/index.ts`, `compatibility_date`.
- `vars.ALLOWED_ORIGINS`: comma-separated allowlist. After the extension is
  published, add `chrome-extension://<store-id>`. For local unpacked testing,
  add the ID shown at `chrome://extensions`. Empty = no cross-origin access.
- D1/KV/R2 bindings are **commented out**. Provision only when the feature
  ships (commands in the file comments):
  ```bash
  wrangler d1 create nawaask-db
  wrangler kv namespace create CACHE
  wrangler r2 bucket create nawaask-files
  ```

## Secrets (production)

```bash
wrangler secret put NAWAASK_JWT_SECRET
wrangler secret put NAWAASK_PROVIDER_API_KEY   # only when the gateway ships
```

Never put secrets in `wrangler.jsonc`, `.dev.vars.example`, or source.

## Deploy

```bash
cd backend
bun run deploy     # wrangler deploy
```

Then point the extension at it at build time:

```bash
VITE_NAWAASK_CLOUD_API_BASE_URL=https://nawaask-api.<you>.workers.dev bun run build
```

Custom domain: Workers dashboard → Triggers → Custom Domains (TLS automatic).

## Environments

Use `--env staging` / `--env production` with matching stanzas in
`wrangler.jsonc` once you need them; keep `APP_ENV` in sync so error
responses stay terse in production.
