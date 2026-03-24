import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { validateSession } from '@/lib/auth';
import { deleteMedia } from '@/lib/db/queries/media';
import { deleteFile } from '@/lib/s3/client';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  return validateSession(token);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [record] = await db.select().from(media).where(eq(media.id, params.id));
  if (!record) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  try {
    await deleteFile(record.s3Key);
  } catch {
    return NextResponse.json({ error: 'Failed to delete file from storage' }, { status: 502 });
  }

  try {
    await deleteMedia(params.id);
  } catch {
    return NextResponse.json({ error: 'Failed to delete media record' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
