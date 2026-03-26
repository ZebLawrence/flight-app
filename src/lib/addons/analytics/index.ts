import type { AddonModule } from '../types';

export type AnalyticsProvider = 'ga4' | 'plausible' | 'custom';

export interface AnalyticsAddonConfig {
  provider: AnalyticsProvider;
  trackingId?: string;
  customScript?: string;
}

/** GA4 tracking IDs must match the format G-XXXXXXXXXX (alphanumeric after the dash). */
const GA4_ID_RE = /^G-[A-Z0-9]+$/;

/** Domain names for Plausible may only contain letters, digits, hyphens, and dots. */
const DOMAIN_RE = /^[a-zA-Z0-9.-]+$/;

/**
 * Generates the appropriate analytics script tag for the given provider config.
 * Returns an empty string when trackingId is missing or invalid for ga4/plausible providers.
 * Custom scripts are returned verbatim; this config must only come from trusted administrators.
 */
export function generateAnalyticsScript(config: AnalyticsAddonConfig): string {
  if (config.provider === 'ga4') {
    if (!config.trackingId || !GA4_ID_RE.test(config.trackingId)) return '';
    return (
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${config.trackingId}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.trackingId}');</script>`
    );
  }
  if (config.provider === 'plausible') {
    if (!config.trackingId || !DOMAIN_RE.test(config.trackingId)) return '';
    return `<script defer data-domain="${config.trackingId}" src="https://plausible.io/js/script.js"></script>`;
  }
  if (config.provider === 'custom') {
    return config.customScript ?? '';
  }
  return '';
}

/**
 * Analytics addon — hooks into tenant layout to inject tracking scripts.
 * Registers no visible components.
 */
export const analyticsAddon: AddonModule = {
  key: 'analytics',
  name: 'Analytics',
};
