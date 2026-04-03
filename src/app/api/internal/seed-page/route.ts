import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API route used only in development / E2E testing.
 * Allows test suites to upsert a page for a tenant without admin UI login.
 *
 * POST /api/internal/seed-page
 * Body: { tenantSlug: string, slug: string, title: string, content: object, published?: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { db } = await import('@/lib/db');
  const { tenants, pages } = await import('@/lib/db/schema');

  const body = await request.json() as {
    tenantSlug?: unknown;
    slug?: unknown;
    title?: unknown;
    content?: unknown;
    published?: unknown;
  };

  const { tenantSlug, slug, title, content, published } = body;

  if (
    typeof tenantSlug !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string'
  ) {
    return NextResponse.json(
      { error: 'tenantSlug, slug, and title are required strings' },
      { status: 400 },
    );
  }

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const pageContent = (
    typeof content === 'object' && content !== null ? content : {}
  ) as Record<string, unknown>;
  const isPublished = typeof published === 'boolean' ? published : true;

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, slug)))
    .limit(1);

  if (existing) {
    await db
      .update(pages)
      .set({ title, content: pageContent, published: isPublished })
      .where(eq(pages.id, existing.id));
  } else {
    await db.insert(pages).values({
      tenantId: tenant.id,
      slug,
      title,
      content: pageContent,
      published: isPublished,
      sortOrder: 99,
    });
  }

  return NextResponse.json({ success: true });
}
