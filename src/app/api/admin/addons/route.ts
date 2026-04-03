import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getAddonByKey, toggleAddon } from '@/lib/db/queries/addons';

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

  const { tenantId, addonKey, enabled } = body;

  if (
    typeof tenantId !== 'string' || !tenantId ||
    typeof addonKey !== 'string' || !addonKey ||
    typeof enabled !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'Missing required fields: tenantId, addonKey, enabled' },
      { status: 400 },
    );
  }

  const addon = await getAddonByKey(addonKey);
  if (!addon) {
    return NextResponse.json({ error: 'Addon not found' }, { status: 404 });
  }

  const config = await toggleAddon(tenantId, addonKey, enabled);
  return NextResponse.json(config);
}
