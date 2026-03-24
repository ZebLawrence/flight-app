import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { updatePage, deletePage } from '@/lib/db/queries/pages';

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
    const page = await updatePage(params.id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      content: body.content && typeof body.content === 'object' && !Array.isArray(body.content)
        ? (body.content as Record<string, unknown>)
        : undefined,
      published: typeof body.published === 'boolean' ? body.published : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
      meta: body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
        ? (body.meta as Record<string, unknown>)
        : undefined,
    });
    return NextResponse.json(page);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
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

  await deletePage(params.id);
  return NextResponse.json({ success: true });
}
