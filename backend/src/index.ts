import { Hono } from "hono";
import { ok, fail } from "./lib/respond.ts";
import { corsAllowlist } from "./middleware/cors.ts";
import { security } from "./middleware/security.ts";
import { v1 } from "./routes/v1/index.ts";
import type { NawaContext } from "./types/env.ts";

export const app = new Hono<NawaContext>();

app.use(security());
app.use(corsAllowlist());

app.get("/health", (c) => {
  return ok(c, {
    status: "ok",
    service: "nawaask-api",
    version: "v1",
    time: new Date().toISOString(),
  });
});

app.route("/api/v1", v1);

app.notFound((c) => fail(c, "NOT_FOUND", "Route not found.", 404));

app.onError((err, c) => {
  // Never leak stack traces or internals to clients.
  const dev = (c.env?.APP_ENV ?? "development") === "development";
  return fail(
    c,
    "INTERNAL_ERROR",
    dev ? err.message : "Unexpected error.",
    500,
  );
});

export default app;
