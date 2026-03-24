import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getPagesByTenant, createPage } from '@/lib/db/queries/pages';

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
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing required query param: tenantId' }, { status: 400 });
  }

  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : NaN;
  const parsedOffset = offsetParam !== null ? parseInt(offsetParam, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, parsedLimit) : 50;
  const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;

  const result = await getPagesByTenant(tenantId, { limit, offset });
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

  const { tenantId, slug, title } = body;

  if (typeof tenantId !== 'string' || !tenantId ||
      typeof slug !== 'string' || !slug ||
      typeof title !== 'string' || !title) {
    return NextResponse.json(
      { error: 'Missing required fields: tenantId, slug, title' },
      { status: 400 },
    );
  }

  const page = await createPage({
    tenantId,
    slug,
    title,
    content: body.content && typeof body.content === 'object' && !Array.isArray(body.content)
      ? (body.content as Record<string, unknown>)
      : undefined,
    published: typeof body.published === 'boolean' ? body.published : undefined,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    meta: body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : undefined,
  });

  return NextResponse.json(page, { status: 201 });
}
