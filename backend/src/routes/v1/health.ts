import { Hono } from "hono";
import { ok } from "../../lib/respond.ts";
import type { NawaContext } from "../../types/env.ts";

const API_VERSION = "v1";

export const healthRoutes = new Hono<NawaContext>().get("/", (c) => {
  const env = c.env?.APP_ENV ?? "development";
  return ok(c, {
    status: "ok",
    version: API_VERSION,
    environment: env,
    services: { api: "up" as const },
  });
});
