export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";

export type GoogleAdsConversionPayload = {
  sendTo: string;
  value?: number;
  currency?: string;
  transactionId?: string;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isGoogleAdsEnabled(): boolean {
  return GOOGLE_ADS_ID.startsWith("AW-");
}

export function gtagEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params || {});
}

export function trackGoogleAdsConversion(payload: GoogleAdsConversionPayload): void {
  const { sendTo, value, currency = "KRW", transactionId } = payload;
  gtagEvent("conversion", {
    send_to: sendTo,
    value,
    currency,
    transaction_id: transactionId,
  });
}
