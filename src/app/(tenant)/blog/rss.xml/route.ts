import { headers } from 'next/headers';
import { getPostsByTenant } from '@/lib/db/queries/blog-posts';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

  const { data: posts } = await getPostsByTenant(tenant.id, { published: true });

  const items = posts
    .map((post) => {
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : '';
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(`${tenantBaseUrl}/blog/${post.slug}`)}</link>
      <description>${escapeXml(post.excerpt ?? '')}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('\n');

  const channelBody = [
    `    <title>${escapeXml(`${tenant.name} Blog`)}</title>`,
    `    <link>${escapeXml(`${tenantBaseUrl}/blog`)}</link>`,
    `    <description>Blog posts from ${escapeXml(tenant.name)}</description>`,
    ...(items ? [items] : []),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
${channelBody}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
