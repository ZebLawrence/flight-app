import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { listTenants, listTemplateTenants, createTenant } from '@/lib/db/queries/tenants';

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

  if (searchParams.get('is_template') === 'true') {
    const templates = await listTemplateTenants();
    return NextResponse.json(templates);
  }

  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : NaN;
  const parsedOffset = offsetParam !== null ? parseInt(offsetParam, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, parsedLimit) : 50;
  const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;

  const result = await listTenants({ limit, offset });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  try {
    const tenant = await createTenant({
      name,
      slug,
      customDomain: typeof body.customDomain === 'string' ? body.customDomain : undefined,
      theme: body.theme && typeof body.theme === 'object' && !Array.isArray(body.theme)
        ? (body.theme as Record<string, unknown>)
        : undefined,
      enabledAddons: Array.isArray(body.enabledAddons)
        ? (body.enabledAddons as string[])
        : undefined,
    });
    return NextResponse.json(tenant, { status: 201 });
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
