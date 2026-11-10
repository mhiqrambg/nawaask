import type { CloudHealth, CloudMeta } from "./types.ts";
import { CloudError, cloudErrorMessage } from "./errors.ts";
import { cloudBaseUrl, isCloudConfigured } from "./config.ts";

const TIMEOUT_MS = 8000;

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code?: unknown; message?: unknown } | null;
}

function narrowEnvelope<T>(raw: unknown): Envelope<T> {
  if (!raw || typeof raw !== "object") {
    throw new CloudError("invalid_response", "Cloud returned an invalid response.");
  }
  if (!("success" in raw) || !("data" in raw) || !("error" in raw)) {
    throw new CloudError("invalid_response", "Cloud returned an invalid response.");
  }
  return raw as Envelope<T>;
}

/**
 * Typed client for the optional NawaAsk Cloud backend.
 * Never called unless a base URL is configured; BYOK paths never touch it.
 */
export class NawaCloudClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const resolved = (baseUrl ?? cloudBaseUrl()).trim().replace(/\/$/, "");
    if (!resolved) {
      throw new CloudError(
        "not-configured",
        "Cloud backend is not configured. Set VITE_NAWAASK_CLOUD_API_BASE_URL at build time.",
      );
    }
    this.baseUrl = resolved;
  }

  static available(): boolean {
    return isCloudConfigured();
  }

  private async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal: signal ?? controller.signal,
      });
      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        throw new CloudError("invalid_response", `Cloud returned status ${res.status}.`, res.status);
      }
      const envelope = narrowEnvelope<T>(raw);
      if (!res.ok || !envelope.success) {
        throw new CloudError(
          typeof envelope.error?.code === "string" ? envelope.error.code : "request_failed",
          cloudErrorMessage(envelope.error, `Cloud request failed (${res.status}).`),
          res.status,
        );
      }
      if (envelope.data === null || envelope.data === undefined) {
        throw new CloudError("invalid_response", "Cloud returned an empty body.");
      }
      return envelope.data;
    } catch (err) {
      if (err instanceof CloudError) throw err;
      if ((err as Error)?.name === "AbortError") {
        throw new CloudError("timeout", "Cloud request timed out.");
      }
      throw new CloudError("network", "Cannot reach the cloud backend.");
    } finally {
      window.clearTimeout(timer);
    }
  }

  health(signal?: AbortSignal): Promise<CloudHealth> {
    return this.get<CloudHealth>("/api/v1/health", signal);
  }

  meta(signal?: AbortSignal): Promise<CloudMeta> {
    return this.get<CloudMeta>("/api/v1/meta", signal);
  }
}
