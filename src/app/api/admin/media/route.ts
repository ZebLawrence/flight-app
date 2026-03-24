import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getMediaByTenant, createMedia } from '@/lib/db/queries/media';
import { uploadFile } from '@/lib/s3';

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

  const result = await getMediaByTenant(tenantId, { limit, offset });
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
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const tenantId = formData.get('tenantId');
  const file = formData.get('file');

  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'Missing required field: tenantId' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key, url } = await uploadFile(tenantId, buffer, file.name, file.type);

  const mediaRecord = await createMedia({
    tenantId,
    filename: file.name,
    s3Key: key,
    url,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
  });

  return NextResponse.json(mediaRecord, { status: 201 });
}
