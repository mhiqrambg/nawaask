import { describe, expect, test } from "bun:test";
import { app } from "../src/index.ts";

interface TestEnvelope {
  success: boolean;
  data: Record<string, unknown>;
  error: { code?: unknown; message?: unknown } | null;
}

async function readBody(res: Response): Promise<TestEnvelope> {
  return (await res.json()) as TestEnvelope;
}
describe("GET /health", () => {
  test("returns ok envelope", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await readBody(res);
    expect(body.success).toBe(true);
    expect(body.error).toBeNull();
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("nawaask-api");
  });
});

describe("GET /api/v1/health", () => {
  test("returns versioned health without secrets", async () => {
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    const body = await readBody(res);
    expect(body.success).toBe(true);
    expect(body.data.version).toBe("v1");
    expect(typeof body.data.environment).toBe("string");
    expect((body.data.services as Record<string, unknown>).api).toBe("up");
    const raw = JSON.stringify(body);
    expect(raw.toLowerCase()).not.toContain("secret");
  });
});

describe("GET /api/v1/meta", () => {
  test("advertises name and disabled cloud features", async () => {
    const res = await app.request("/api/v1/meta");
    expect(res.status).toBe(200);
    const body = await readBody(res);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("NawaAsk");
    expect(body.data.defaultMode).toBe("byok");
    for (const flag of Object.values(body.data.features as Record<string, boolean>)) {
      expect(flag).toBe(false);
    }
  });
});

describe("errors", () => {
  test("unknown route returns 404 envelope", async () => {
    const res = await app.request("/api/v1/nope");
    expect(res.status).toBe(404);
    const body = await readBody(res);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe("NOT_FOUND");
  });

  test("oversized content-length is rejected", async () => {
    const res = await app.request("/api/v1/health", {
      method: "POST",
      headers: { "Content-Length": "2097152" },
    });
    expect(res.status).toBe(413);
    const body = await readBody(res);
    expect(body.error?.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("security headers", () => {
  test("baseline headers present", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});

describe("CORS allowlist", () => {
  const withOrigin = (origin: string) =>
    app.request("/api/v1/meta", {
      headers: { Origin: origin },
    });

  test("unlisted origin gets no CORS headers", async () => {
    const res = await withOrigin("https://evil.example");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("preflight for unlisted origin is forbidden", async () => {
    const res = await app.request("/api/v1/meta", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    expect(res.status).toBe(403);
  });
});
