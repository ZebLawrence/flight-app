import { headers } from 'next/headers';
import { getPagesByTenant } from '@/lib/db/queries/pages';
import { getPostsByTenant } from '@/lib/db/queries/blog-posts';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);
  if (!tenant) {
    return new Response('Not found', { status: 404 });
  }

  const protocol = hostname.startsWith('localhost') ? 'http' : 'https';
  const tenantBaseUrl = `${protocol}://${hostname}`;

  const [{ data: pages }, { data: posts }] = await Promise.all([
    getPagesByTenant(tenant.id),
    getPostsByTenant(tenant.id, { published: true }),
  ]);

  const publishedPages = pages.filter((page) => page.published);

  const pageUrls = publishedPages.map((page) => {
    const loc = `${tenantBaseUrl}/${page.slug}`;
    const lastmod = new Date(page.updatedAt).toISOString();
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  });

  const postUrls = posts.map((post) => {
    const loc = `${tenantBaseUrl}/blog/${post.slug}`;
    const lastmod = new Date(post.updatedAt).toISOString();
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  });

  const urlEntries = [...pageUrls, ...postUrls].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
