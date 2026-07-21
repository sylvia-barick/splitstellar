/**
 * Google Analytics Event Tracking Utility
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SPLITSTELLAR";

// Track pageviews
export function pageview(url: string) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("config", GA_TRACKING_ID, {
      page_path: url,
    });
  }
}

// Track specific events
export function trackEvent({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

export const ANALYTICS_EVENTS = {
  CONNECT_WALLET: "connect_wallet",
  CREATE_GROUP: "create_group",
  CREATE_EXPENSE: "create_expense",
  SETTLE_EXPENSE: "settle_expense",
  MONEY_REQUEST: "money_request",
  RESPOND_REQUEST: "respond_request",
  RETURN_MONEY: "return_money",
};
