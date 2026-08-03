"use client";

import type { WhatsAppLead } from "./company-contact";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackWhatsAppClick({ buttonText, tripName, lead }: { buttonText: string; tripName?: string; lead?: WhatsAppLead }) {
  const params = new URLSearchParams(window.location.search);
  const eventData = {
    event: "whatsapp_click",
    page_origin: window.location.pathname,
    trip_name: tripName ?? null,
    button_text: buttonText,
    clicked_at: new Date().toISOString(),
    campaign_id: params.get("utm_campaign"),
    travelers: lead?.travelers ?? null,
    interest: lead?.interest ?? null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_content: params.get("utm_content"),
  };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(eventData);
  window.gtag?.("event", "whatsapp_click", eventData);
  window.fbq?.("trackCustom", "whatsapp_click", eventData);
}
