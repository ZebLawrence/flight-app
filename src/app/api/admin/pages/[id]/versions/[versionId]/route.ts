import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getVersion, createVersion, pruneVersions } from '@/lib/db/queries/page-versions';
import { getPageById, updatePage } from '@/lib/db/queries/pages';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const version = await getVersion(params.versionId);
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  return NextResponse.json(version);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const version = await getVersion(params.versionId);
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const current = await getPageById(params.id);
  if (!current) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Save current state as a version before overwriting
  await createVersion(params.id, current.content, current.title);

  // Restore the selected version's content
  const page = await updatePage(params.id, {
    content: version.content as Record<string, unknown>,
    title: version.title,
  });

  // Prune versions to keep last 10
  await pruneVersions(params.id, 10);

  return NextResponse.json(page);
}
