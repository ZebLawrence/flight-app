import { readFile } from 'fs/promises';
import { join } from 'path';
import { headers } from 'next/headers';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

let defaultFaviconCache: Buffer | null = null;

async function getDefaultFavicon(): Promise<Buffer | null> {
  if (defaultFaviconCache) {
    return defaultFaviconCache;
  }
  try {
    const filePath = join(process.cwd(), 'public', 'default-favicon.ico');
    defaultFaviconCache = await readFile(filePath);
    return defaultFaviconCache;
  } catch {
    return null;
  }
}

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

  const fileBuffer = await getDefaultFavicon();

  if (!fileBuffer) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
