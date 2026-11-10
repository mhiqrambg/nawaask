import { createMiddleware } from "hono/factory";

const MAX_BYTES = 1_048_576; // 1 MiB

/**
 * Baseline API hardening: security headers + request size cap.
 * No request/response bodies are logged here by design.
 */
export function security() {
  return createMiddleware(async (c, next) => {
    const length = c.req.header("Content-Length");
    if (length && Number(length) > MAX_BYTES) {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large." },
        },
        413,
      );
    }
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
  });
}
