import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getTenantById, createTenant } from '@/lib/db/queries/tenants';
import { getPagesByTenant, createPage } from '@/lib/db/queries/pages';
import { getTenantAddons, createTenantAddonConfig } from '@/lib/db/queries/addons';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, slug } = body;

  if (typeof name !== 'string' || !name || typeof slug !== 'string' || !slug) {
    return NextResponse.json(
      { error: 'Missing required fields: name, slug' },
      { status: 400 },
    );
  }

  const source = await getTenantById(params.id);
  if (!source) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  try {
    const newTenant = await createTenant({
      name,
      slug,
      theme: source.theme as Record<string, unknown>,
    });

    // Fetch all source pages; limit is set high to capture any realistic tenant page count
    const MAX_PAGES = 10_000;
    const { data: sourcePages } = await getPagesByTenant(params.id, { limit: MAX_PAGES });
    await Promise.all(
      sourcePages.map((page) =>
        createPage({
          tenantId: newTenant.id,
          slug: page.slug,
          title: page.title,
          content: page.content as Record<string, unknown>,
          published: page.published,
          sortOrder: page.sortOrder,
          meta: page.meta as Record<string, unknown> | null,
        }),
      ),
    );

    const sourceAddons = await getTenantAddons(params.id);
    await Promise.all(
      sourceAddons.map((addon) =>
        createTenantAddonConfig(
          newTenant.id,
          addon.addonKey,
          addon.config as Record<string, unknown>,
          addon.enabled,
        ),
      ),
    );

    return NextResponse.json(newTenant, { status: 201 });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    throw error;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === '23505';
  }
  return false;
}
