import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiErrorBody {
  code: string;
  message: string;
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, data, error: null }, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
) {
  const body: { success: false; data: null; error: ApiErrorBody } = {
    success: false,
    data: null,
    error: { code, message },
  };
  return c.json(body, status);
}
