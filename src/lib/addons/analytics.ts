export type AnalyticsProvider = 'ga4' | 'plausible';

export interface GA4Config {
  provider: 'ga4';
  trackingId: string;
}

export interface PlausibleConfig {
  provider: 'plausible';
  domain: string;
}

export type AnalyticsConfig = GA4Config | PlausibleConfig;

/** GA4 tracking IDs must match the format G-XXXXXXXXXX (alphanumeric after the dash). */
const GA4_ID_RE = /^G-[A-Z0-9]+$/;

/** Domain names may only contain letters, digits, hyphens, and dots. */
const DOMAIN_RE = /^[a-zA-Z0-9.-]+$/;

export function isAnalyticsConfig(config: unknown): config is AnalyticsConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  if (c.provider === 'ga4') {
    return typeof c.trackingId === 'string' && GA4_ID_RE.test(c.trackingId);
  }
  if (c.provider === 'plausible') {
    return (
      typeof c.domain === 'string' &&
      c.domain.length > 0 &&
      c.domain.length <= 253 &&
      DOMAIN_RE.test(c.domain)
    );
  }
  return false;
}
