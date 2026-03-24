import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getPageById, updatePage, deletePage } from '@/lib/db/queries/pages';
import { createVersion, pruneVersions } from '@/lib/db/queries/page-versions';

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
    // 1. Fetch current page content
    const current = await getPageById(params.id);
    if (!current) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // 2. Save old state as a version snapshot
    await createVersion(params.id, current.content, current.title);

    // 3. Update the page with new content
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

    // 4. Prune versions to keep last 10
    await pruneVersions(params.id, 10);

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
