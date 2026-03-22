import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { registry } from '@/components/cms/registry';
import { isAnalyticsConfig } from '@/lib/addons/analytics';
import { renderComponentTree } from '@/lib/renderer';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

type TenantPageProps = {
  params: {
    slug?: string[];
  };
};

export default async function TenantPage({ params }: TenantPageProps) {
  const [{ db }, schema] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/db/schema'),
  ]);
  const { pages, tenantAddonConfigs } = schema;

  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);
  if (!tenant) {
    notFound();
  }

  const pageSlug = params.slug?.join('/') ?? '';

  const [pageRows, addonRows] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.tenantId, tenant.id),
          eq(pages.slug, pageSlug),
          eq(pages.published, true),
        ),
      )
      .limit(1),
    db
      .select()
      .from(tenantAddonConfigs)
      .where(
        and(
          eq(tenantAddonConfigs.tenantId, tenant.id),
          eq(tenantAddonConfigs.addonKey, 'analytics'),
          eq(tenantAddonConfigs.enabled, true),
        ),
      )
      .limit(1),
  ]);

  const page = pageRows[0];
  if (!page) {
    notFound();
  }

  const renderedTree = renderComponentTree(page.content, registry);

  const analyticsConfig = addonRows[0]?.config;
  const validConfig = isAnalyticsConfig(analyticsConfig) ? analyticsConfig : null;

  // Both trackingId and domain are validated by isAnalyticsConfig to only contain
  // safe character sets (GA4: /^G-[A-Z0-9]+$/, domain: /^[a-zA-Z0-9.-]+$/) so
  // interpolation into script src URLs and attribute values is safe.
  return (
    <>
      {validConfig?.provider === 'ga4' && (
        <>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${validConfig.trackingId}`} />
          {/* trackingId is constrained to /^G-[A-Z0-9]+$/ — no characters that
              could break out of a JS string literal are possible. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${validConfig.trackingId}');`,
            }}
          />
        </>
      )}
      {validConfig?.provider === 'plausible' && (
        // domain is constrained to /^[a-zA-Z0-9.-]+$/ — React escapes the attribute value.
        <script
          defer
          data-domain={validConfig.domain}
          src="https://plausible.io/js/script.js"
        />
      )}
      <article>{renderedTree}</article>
    </>
  );
}
