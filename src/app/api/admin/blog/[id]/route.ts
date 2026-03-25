import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getPostById, updatePost, deletePost } from '@/lib/db/queries/blog-posts';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const post = await getPostById(params.id);
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(post);
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
    const current = await getPostById(params.id);
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isFirstPublish =
      typeof body.published === 'boolean' &&
      body.published &&
      !current.published;

    const post = await updatePost(params.id, {
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      excerpt: typeof body.excerpt === 'string' ? body.excerpt : undefined,
      content: typeof body.content === 'string' ? body.content : undefined,
      author: typeof body.author === 'string' ? body.author : undefined,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      featuredImage: typeof body.featured_image === 'string' ? body.featured_image : undefined,
      published: typeof body.published === 'boolean' ? body.published : undefined,
      publishedAt: isFirstPublish ? new Date() : undefined,
    });

    return NextResponse.json(post);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  await deletePost(params.id);
  return NextResponse.json({ success: true });
}
