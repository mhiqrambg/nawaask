import { Hono } from "hono";
import { healthRoutes } from "./health.ts";
import { metaRoutes } from "./meta.ts";
import type { NawaContext } from "../../types/env.ts";

export const v1 = new Hono<NawaContext>();
v1.route("/health", healthRoutes);
v1.route("/meta", metaRoutes);
