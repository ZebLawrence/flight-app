import { headers } from 'next/headers';
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

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${tenantBaseUrl}/sitemap.xml`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
