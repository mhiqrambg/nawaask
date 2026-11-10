# NawaAsk Cloud Architecture

## Principle

The cloud backend is **optional**. BYOK is the product; cloud is an upgrade
path. Every cloud feature ships behind a capability flag advertised by
`GET /api/v1/meta`, and the extension enables nothing the backend does not
advertise.

## BYOK mode (default)

- AI traffic: extension → provider base URL directly.
- Storage: 100% local (IndexedDB + chrome.storage).
- Network to NawaAsk infrastructure: zero requests.
- Selecting Cloud mode without a configured endpoint is impossible
  (button disabled; client throws `not-configured` before fetching).

## Cloud mode (foundation only)

Implemented today:

| Piece | Status |
|---|---|
| `GET /health`, `GET /api/v1/health`, `GET /api/v1/meta` | ✅ live |
| Typed client (`NawaCloudClient.health/meta`, 8 s timeout) | ✅ live |
| Endpoint configuration (`VITE_NAWAASK_CLOUD_API_BASE_URL`) | ✅ live |
| Mode switch + status check in Options → General | ✅ live |
| Auth / sync / subscriptions / usage / AI gateway | ❌ flags `false`, not built |

Discovery flow: Options → Operating mode → Check cloud status →
`health()` + `meta()` → version, environment, enabled features shown.

## Future AI gateway (not built)

```
Extension → (auth) → Hono backend → provider (server-side secret)
        → backend → extension
```

Gating requirements before any gateway ships: authentication,
authorization, rate limiting, usage limits, request validation, abuse
protection, cost controls, Worker secrets. No public unrestricted proxy,
ever. BYOK direct flow remains the default even after the gateway exists.

## Storage split (target state)

- Local (always): conversations cache, settings, provider keys.
- Cloud (later, per-user, authenticated): synced conversations, profiles,
  preferences, subscription metadata (D1); cache/ephemera (KV); user files
  (R2, only when attachments ship).
