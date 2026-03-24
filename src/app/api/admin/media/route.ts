import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getMediaByTenant, createMedia } from '@/lib/db/queries/media';
import { uploadFile } from '@/lib/s3/client';

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
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const result = await getMediaByTenant(tenantId);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const tenantId = formData.get('tenantId');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  let key: string;
  let url: string;
  try {
    ({ key, url } = await uploadFile(tenantId, Buffer.from(await file.arrayBuffer()), file.name, file.type));
  } catch {
    return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 502 });
  }

  try {
    const mediaItem = await createMedia({
      tenantId,
      filename: file.name,
      s3Key: key,
      url,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json(mediaItem, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 });
  }
}
