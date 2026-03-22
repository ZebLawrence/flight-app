import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API route used only in development / E2E testing.
 * Allows test suites to set a tenant's addon config without an admin UI.
 *
 * POST /api/internal/addon-config
 * Body: { tenantSlug: string, addonKey: string, config: object, enabled: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { db } = await import('@/lib/db');
  const { tenants, tenantAddonConfigs } = await import('@/lib/db/schema');

  const body = await request.json() as {
    tenantSlug?: unknown;
    addonKey?: unknown;
    config?: unknown;
    enabled?: unknown;
  };

  const { tenantSlug, addonKey, config, enabled } = body;

  if (typeof tenantSlug !== 'string' || typeof addonKey !== 'string') {
    return NextResponse.json(
      { error: 'tenantSlug and addonKey are required strings' },
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

  await db
    .insert(tenantAddonConfigs)
    .values({
      tenantId: tenant.id,
      addonKey,
      config: (typeof config === 'object' && config !== null ? config : {}) as Record<string, unknown>,
      enabled: typeof enabled === 'boolean' ? enabled : false,
    })
    .onConflictDoUpdate({
      target: [tenantAddonConfigs.tenantId, tenantAddonConfigs.addonKey],
      set: {
        config: (typeof config === 'object' && config !== null ? config : {}) as Record<string, unknown>,
        enabled: typeof enabled === 'boolean' ? enabled : false,
      },
    });

  return NextResponse.json({ success: true });
}
