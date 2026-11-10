/**
 * Shared environment bindings for the NawaAsk Worker.
 * Secrets (API keys, signing keys) MUST go through `wrangler secret put`,
 * never into this file or vars.
 */
export interface NawaEnv {
  /** Deployment environment label: development | staging | production. */
  APP_ENV?: string;
  /** Public API version served under /api. */
  API_VERSION?: string;
  /**
   * Comma-separated explicit CORS origin allowlist, e.g.
   * "chrome-extension://<store-id>,http://localhost:5173".
   * No wildcard. Empty = no cross-origin access.
   */
  ALLOWED_ORIGINS?: string;

  // --- Future bindings (provision only when the feature ships) ---
  // DB?: D1Database;      // provision: wrangler d1 create nawaask-db
  // CACHE?: KVNamespace;  // provision: wrangler kv namespace create CACHE
  // FILES?: R2Bucket;     // provision: wrangler r2 bucket create nawaask-files
}

export type NawaContext = {
  Bindings: NawaEnv;
};
