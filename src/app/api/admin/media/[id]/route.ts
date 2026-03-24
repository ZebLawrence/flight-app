import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getMediaById, deleteMedia } from '@/lib/db/queries/media';
import { deleteFile } from '@/lib/s3/client';

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

  const record = await getMediaById(params.id);

  if (!record) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  await deleteFile(record.s3Key);
  await deleteMedia(params.id);

  return NextResponse.json({ success: true });
}
