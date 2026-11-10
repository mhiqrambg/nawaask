export type NawaAskMode = "byok" | "cloud";

export interface CloudApiError {
  code: string;
  message: string;
}

export interface CloudHealth {
  status: string;
  version: string;
  environment: string;
  services: Record<string, string>;
}

export interface CloudFeatures {
  auth: boolean;
  sync: boolean;
  subscriptions: boolean;
  usageTracking: boolean;
  aiGateway: boolean;
}

export interface CloudMeta {
  name: string;
  tagline: string;
  apiVersion: string;
  features: CloudFeatures;
  defaultMode: NawaAskMode;
}
