export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
export const GOOGLE_ADS_CONV_SIGNUP =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_SIGNUP || "";
export const GOOGLE_ADS_CONV_SUPPORT =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_SUPPORT || "";
export const GOOGLE_ADS_CONV_PORTFOLIO_VERIFY =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_PORTFOLIO_VERIFY || "";

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

function resolveSendTo(labelOrSendTo: string): string {
  if (!labelOrSendTo) return "";
  if (labelOrSendTo.startsWith("AW-")) return labelOrSendTo;
  if (!isGoogleAdsEnabled()) return "";
  return `${GOOGLE_ADS_ID}/${labelOrSendTo}`;
}

export function trackSignupCompleteConversion(): void {
  const sendTo = resolveSendTo(GOOGLE_ADS_CONV_SIGNUP);
  if (!sendTo) return;
  trackGoogleAdsConversion({ sendTo, value: 1, currency: "KRW" });
}

export function trackSupportSubmitConversion(): void {
  const sendTo = resolveSendTo(GOOGLE_ADS_CONV_SUPPORT);
  if (!sendTo) return;
  trackGoogleAdsConversion({ sendTo, value: 1, currency: "KRW" });
}

export function trackPortfolioVerifyConversion(): void {
  const sendTo = resolveSendTo(GOOGLE_ADS_CONV_PORTFOLIO_VERIFY);
  if (!sendTo) return;
  trackGoogleAdsConversion({ sendTo, value: 1, currency: "KRW" });
}
