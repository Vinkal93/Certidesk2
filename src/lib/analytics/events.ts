export type ConversionEventName =
  | "page_view"
  | "view_pricing"
  | "view_feature"
  | "click_register"
  | "registration_started"
  | "registration_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "wallet_recharge_started"
  | "wallet_recharge_success"
  | "demo_requested"
  | "contact_submitted";

const SENSITIVE_PARAM_KEYS = [
  "password",
  "otp",
  "token",
  "secret",
  "cookie",
  "authorization",
  "email",
  "phone",
  "mobile",
];

export type SafeEventParams = Record<string, string | number | boolean>;

export function sanitizeAnalyticsParams(
  params: Record<string, unknown> = {}
): SafeEventParams {
  const safe: SafeEventParams = {};
  for (const [key, value] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_PARAM_KEYS.some((s) => lower.includes(s))) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackConversionEvent(
  eventName: ConversionEventName,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  const safeParams = sanitizeAnalyticsParams(params);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, safeParams);
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...safeParams,
    });
  }
}
