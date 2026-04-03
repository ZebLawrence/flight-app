import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { validateSession } from '@/lib/auth';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
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

  const { tenantId } = body;

  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'Missing required field: tenantId' }, { status: 400 });
  }

  revalidateTag(`tenant-${tenantId}`);

  return NextResponse.json({ revalidated: true, tenantId });
}
