import { and, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { registry } from '@/components/cms/registry';
import { isAnalyticsConfig } from '@/lib/addons/analytics';
import { getPageById, getPageBySlug } from '@/lib/db/queries/pages';
import type { Page } from '@/lib/db/schema';
import { validatePreviewToken } from '@/lib/preview';
import { renderComponentTree } from '@/lib/renderer';
import { resolveTenant } from '@/lib/tenant/resolve';
import type { PageMeta } from '@/lib/types/component';

export const revalidate = 60;

type TenantPageProps = {
  params: {
    slug?: string[];
  };
  searchParams: {
    preview?: string;
  };
};

function getHostname(): string {
  const requestHeaders = headers();
  return (
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    ''
  );
}

export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const hostname = getHostname();
  const tenant = await resolveTenant(hostname);
  if (!tenant) {
    return {};
  }

  const pageSlug = params.slug?.join('/') ?? '';
  const page = await getPageBySlug(tenant.id, pageSlug);

  if (!page || !page.published) {
    return {};
  }

  const meta = page.meta as PageMeta | null | undefined;

  const tenantDomain = tenant.customDomain ?? hostname;
  const canonicalPath = pageSlug ? `/${pageSlug}` : '/';
  const canonicalUrl = `https://${tenantDomain}${canonicalPath}`;

  return {
    title: meta?.title ?? page.title,
    description: meta?.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: meta?.ogTitle ?? meta?.title ?? page.title,
      description: meta?.ogDescription ?? meta?.description,
      ...(meta?.ogImage ? { images: [meta.ogImage] } : {}),
      type: meta?.ogType ?? 'website',
    },
  };
}

export default async function TenantPage({ params, searchParams }: TenantPageProps) {
  const [{ db }, schema] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/db/schema'),
  ]);
  const { pages, tenantAddonConfigs } = schema;

  const tenant = await resolveTenant(getHostname());
  if (!tenant) {
    notFound();
  }

  const previewToken = searchParams.preview;
  let isPreview = false;
  let pagePromise: Promise<Page | null>;

  if (previewToken) {
    const tokenPayload = validatePreviewToken(previewToken);
    if (!tokenPayload || tokenPayload.tenantId !== tenant.id) {
      notFound();
    }
    pagePromise = getPageById(tokenPayload.pageId).then((p) =>
      p?.tenantId === tenant.id ? p : null,
    );
    isPreview = true;
  } else {
    const pageSlug = params.slug?.join('/') ?? '';
    pagePromise = db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.tenantId, tenant.id),
          eq(pages.slug, pageSlug),
          eq(pages.published, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  const [page, addonRows] = await Promise.all([
    pagePromise,
    db
      .select()
      .from(tenantAddonConfigs)
      .where(
        and(
          eq(tenantAddonConfigs.tenantId, tenant.id),
          eq(tenantAddonConfigs.enabled, true),
        ),
      ),
  ]);

  if (!page) {
    notFound();
  }

  const enabledAddons = addonRows.map((row) => row.addonKey);
  const renderedTree = renderComponentTree(page.content, registry, enabledAddons);

  const analyticsRow = addonRows.find((row) => row.addonKey === 'analytics');
  const analyticsConfig = analyticsRow?.config;
  const validConfig = isAnalyticsConfig(analyticsConfig) ? analyticsConfig : null;

  // Both trackingId and domain are validated by isAnalyticsConfig to only contain
  // safe character sets (GA4: /^G-[A-Z0-9]+$/, domain: /^[a-zA-Z0-9.-]+$/) so
  // interpolation into script src URLs and attribute values is safe.
  return (
    <>
      {isPreview && (
        <div className="fixed left-0 right-0 top-0 z-[9999] bg-amber-400 px-4 py-2 text-center text-sm font-bold text-black">
          ⚠️ Preview Mode — This page is not published
        </div>
      )}
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
        // trackingId is constrained to /^[a-zA-Z0-9.-]+$/ — React escapes the attribute value.
        <script
          defer
          data-domain={validConfig.trackingId}
          src="https://plausible.io/js/script.js"
        />
      )}
      <article className={isPreview ? 'pt-10' : undefined}>{renderedTree}</article>
    </>
  );
}
