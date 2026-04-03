import { readFile } from 'fs/promises';
import { join } from 'path';
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

  const faviconUrl = tenant?.theme?.favicon;

  if (faviconUrl) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: faviconUrl,
      },
    });
  }

  const defaultFaviconPath = join(process.cwd(), 'public', 'default-favicon.ico');
  const fileBuffer = await readFile(defaultFaviconPath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
