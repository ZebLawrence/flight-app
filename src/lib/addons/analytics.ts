export type {
  AnalyticsProvider,
  AnalyticsAddonConfig,
} from './analytics/index';
export { generateAnalyticsScript, analyticsAddon } from './analytics/index';

import type { AnalyticsAddonConfig } from './analytics/index';

/** GA4 tracking IDs must match the format G-XXXXXXXXXX (alphanumeric after the dash). */
const GA4_ID_RE = /^G-[A-Z0-9]+$/;

/** Domain names may only contain letters, digits, hyphens, and dots. */
const DOMAIN_RE = /^[a-zA-Z0-9.-]+$/;

export function isAnalyticsConfig(config: unknown): config is AnalyticsAddonConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  if (c.provider === 'ga4') {
    return typeof c.trackingId === 'string' && GA4_ID_RE.test(c.trackingId);
  }
  if (c.provider === 'plausible') {
    return (
      typeof c.trackingId === 'string' &&
      c.trackingId.length > 0 &&
      c.trackingId.length <= 253 &&
      DOMAIN_RE.test(c.trackingId)
    );
  }
  if (c.provider === 'custom') {
    return typeof c.customScript === 'string' && c.customScript.length > 0;
  }
  return false;
}
