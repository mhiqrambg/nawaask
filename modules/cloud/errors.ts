import { NawaError } from "@/utils/errors";

export class CloudError extends NawaError {
  constructor(code: string, message: string, status?: number) {
    super(code, message, status);
    this.name = "CloudError";
  }
}

/** Narrow an unknown API error payload without inventing shapes. */
export function cloudErrorMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object" && "message" in raw) {
    const message: unknown = raw.message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
