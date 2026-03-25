import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getPostsByTenant, createPost } from '@/lib/db/queries/blog-posts';

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

  const result = await getPostsByTenant(tenantId, { limit, offset });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get('tenantId');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const tenantId = tenantIdParam ?? (typeof body.tenantId === 'string' ? body.tenantId : undefined);
  const { slug, title, content, author } = body;

  if (
    typeof tenantId !== 'string' || !tenantId ||
    typeof slug !== 'string' || !slug ||
    typeof title !== 'string' || !title ||
    typeof content !== 'string' || !content ||
    typeof author !== 'string' || !author
  ) {
    return NextResponse.json(
      { error: 'Missing required fields: tenantId, slug, title, content, author' },
      { status: 400 },
    );
  }

  try {
    const post = await createPost({
      tenantId,
      slug,
      title,
      excerpt: typeof body.excerpt === 'string' ? body.excerpt : null,
      content,
      author,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      featuredImage: typeof body.featured_image === 'string' ? body.featured_image : null,
      published: typeof body.published === 'boolean' ? body.published : false,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message.includes('duplicate') || error.message.includes('unique'))
    ) {
      return NextResponse.json({ error: 'Slug already exists for this tenant' }, { status: 409 });
    }
    throw error;
  }
}
