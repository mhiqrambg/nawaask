import { createMiddleware } from "hono/factory";

/**
 * Explicit-origin CORS. No wildcard, no credentials reflection.
 * Allowed origins come from ALLOWED_ORIGINS (comma-separated).
 * Non-listed origins get no CORS headers (browser blocks, curl still works).
 */
export function corsAllowlist() {
  return createMiddleware(async (c, next) => {
    const origin = c.req.header("Origin") ?? "";
    const raw = c.env?.ALLOWED_ORIGINS ?? "";
    const allowed = raw
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const permitted = origin !== "" && allowed.includes(origin);

    if (c.req.method === "OPTIONS") {
      if (!permitted) return c.text("Forbidden", 403);
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }

    await next();
    if (permitted) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin");
    }
  });
}
