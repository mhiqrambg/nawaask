/** Build-time public config. Empty string = cloud unavailable. */
export function cloudBaseUrl(): string {
  const env = import.meta.env as Record<string, unknown> | undefined;
  const raw = env?.VITE_NAWAASK_CLOUD_API_BASE_URL;
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/$/, "");
}

export function isCloudConfigured(): boolean {
  return cloudBaseUrl() !== "";
}
