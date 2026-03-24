import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getVersionsByPage } from '@/lib/db/queries/page-versions';

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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const offset = Number(searchParams.get('offset') ?? 0);

  const result = await getVersionsByPage(params.id, { limit, offset });
  return NextResponse.json(result);
}
