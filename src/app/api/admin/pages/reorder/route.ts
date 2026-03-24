import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { reorderPages } from '@/lib/db/queries/pages';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { tenantId, pages } = body;

  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'Missing required field: tenantId' }, { status: 400 });
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: 'Missing required field: pages' }, { status: 400 });
  }

  for (const item of pages) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).id !== 'string' ||
      !(item as Record<string, unknown>).id ||
      typeof (item as Record<string, unknown>).sort_order !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Each page must have a string id and numeric sort_order' },
        { status: 400 },
      );
    }
  }

  const sortedIds = [...(pages as Array<{ id: string; sort_order: number }>)]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.id);

  try {
    await reorderPages(tenantId, sortedIds);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'One or more pages not found' }, { status: 404 });
    }
    throw error;
  }
}
