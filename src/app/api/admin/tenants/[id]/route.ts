import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getTenantById, updateTenant, deleteTenant } from '@/lib/db/queries/tenants';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function PUT(
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

  try {
    const tenant = await updateTenant(params.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      customDomain: typeof body.customDomain === 'string' ? body.customDomain : undefined,
      theme: body.theme && typeof body.theme === 'object' && !Array.isArray(body.theme)
        ? (body.theme as Record<string, unknown>)
        : undefined,
      enabledAddons: Array.isArray(body.enabledAddons)
        ? (body.enabledAddons as string[])
        : undefined,
    });
    return NextResponse.json(tenant);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await getTenantById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  await deleteTenant(params.id);
  return NextResponse.json({ success: true });
}
