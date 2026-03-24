import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getPageById } from '@/lib/db/queries/pages';
import { getTenantById } from '@/lib/db/queries/tenants';
import { generatePreviewToken } from '@/lib/preview';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Missing required query param: pageId' }, { status: 400 });
  }

  const page = await getPageById(pageId);
  if (!page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const tenant = await getTenantById(page.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const platformDomain = process.env.PLATFORM_DOMAIN;
  if (!platformDomain) {
    return NextResponse.json({ error: 'Server misconfiguration: PLATFORM_DOMAIN is not set' }, { status: 500 });
  }

  const token = generatePreviewToken(pageId, tenant.id);
  const redirectUrl = `http://${tenant.slug}.${platformDomain}/${page.slug}?preview=${token}`;

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
