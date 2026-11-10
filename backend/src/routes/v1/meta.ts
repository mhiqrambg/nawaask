import { Hono } from "hono";
import { ok } from "../../lib/respond.ts";
import type { NawaContext } from "../../types/env.ts";

/**
 * Public capability advertisement. Every cloud feature defaults to
 * disabled until it is actually implemented and launched.
 */
export const metaRoutes = new Hono<NawaContext>().get("/", (c) => {
  return ok(c, {
    name: "NawaAsk",
    tagline: "Your AI, Anywhere on the Web.",
    apiVersion: "v1",
    features: {
      auth: false,
      sync: false,
      subscriptions: false,
      usageTracking: false,
      aiGateway: false,
    },
    defaultMode: "byok" as const,
  });
});
