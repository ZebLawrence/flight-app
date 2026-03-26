import { describe, it, expect } from 'vitest';
import { analyticsAddon, generateAnalyticsScript } from '@/lib/addons/analytics/index';

describe('analytics addon', () => {
  it('GA4 provider generates correct gtag.js script tag with tracking ID', () => {
    const result = generateAnalyticsScript({ provider: 'ga4', trackingId: 'G-XXXXXXXX' });
    expect(result).toBe(
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>' +
        `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-XXXXXXXX');</script>`,
    );
  });

  it('Plausible provider generates correct <script data-domain> tag', () => {
    const result = generateAnalyticsScript({ provider: 'plausible', trackingId: 'example.com' });
    expect(result).toBe(
      '<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>',
    );
  });

  it('Custom provider injects the raw customScript string', () => {
    const customScript = '<script>console.log("custom analytics");</script>';
    const result = generateAnalyticsScript({ provider: 'custom', customScript });
    expect(result).toBe(customScript);
  });

  it('Missing trackingId renders nothing', () => {
    expect(generateAnalyticsScript({ provider: 'ga4' })).toBe('');
    expect(generateAnalyticsScript({ provider: 'plausible' })).toBe('');
  });

  it('Addon metadata has correct key and name', () => {
    expect(analyticsAddon.key).toBe('analytics');
    expect(analyticsAddon.name).toBe('Analytics');
  });
});
