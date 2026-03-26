import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getTenantAddons } from '@/lib/db/queries/addons';
import { generateAnalyticsScript } from '@/lib/addons/analytics';
import type { AnalyticsAddonConfig } from '@/lib/addons/analytics';

export const dynamic = 'force-dynamic';

function toAnalyticsConfig(config: unknown): AnalyticsAddonConfig | null {
  if (
    typeof config !== 'object' ||
    config === null ||
    !('provider' in config) ||
    !['ga4', 'plausible', 'custom'].includes((config as Record<string, unknown>).provider as string)
  ) {
    return null;
  }
  return config as AnalyticsAddonConfig;
}

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);

  let analyticsConfig: AnalyticsAddonConfig | null = null;
  if (tenant) {
    const addonConfigs = await getTenantAddons(tenant.id);
    const enabledAnalytics = addonConfigs.find(c => c.addonKey === 'analytics' && c.enabled);
    if (enabledAnalytics) {
      const parsed = toAnalyticsConfig(enabledAnalytics.config);
      if (parsed && generateAnalyticsScript(parsed)) {
        analyticsConfig = parsed;
      }
    }
  }

  return (
    <>
      {analyticsConfig?.provider === 'ga4' && analyticsConfig.trackingId && (
        <>
          <Script
            strategy="beforeInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.trackingId}`}
          />
          <Script
            id="analytics-ga4-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsConfig.trackingId}');`,
            }}
          />
        </>
      )}
      {analyticsConfig?.provider === 'plausible' && analyticsConfig.trackingId && (
        <Script
          id="analytics-plausible"
          strategy="beforeInteractive"
          src="https://plausible.io/js/script.js"
          data-domain={analyticsConfig.trackingId}
        />
      )}
      {analyticsConfig?.provider === 'custom' && analyticsConfig.customScript && (
        <Script
          id="analytics-custom"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: analyticsConfig.customScript }}
        />
      )}
      <ThemeProvider theme={tenant?.theme ?? null}>
        <main>{children}</main>
      </ThemeProvider>
    </>
  );
}
