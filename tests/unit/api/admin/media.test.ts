// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetMediaByTenant = vi.hoisted(() => vi.fn());
const mockGetMediaById = vi.hoisted(() => vi.fn());
const mockCreateMedia = vi.hoisted(() => vi.fn());
const mockDeleteMedia = vi.hoisted(() => vi.fn());
const mockUploadFile = vi.hoisted(() => vi.fn());
const mockDeleteFile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/media', () => ({
  getMediaByTenant: mockGetMediaByTenant,
  getMediaById: mockGetMediaById,
  createMedia: mockCreateMedia,
  deleteMedia: mockDeleteMedia,
}));

vi.mock('@/lib/s3', () => ({
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
}));

const media1 = {
  id: 'media-uuid-1',
  tenantId: 'tenant-uuid-1',
  filename: 'photo.jpg',
  s3Key: 'tenant-uuid-1/photo.jpg',
  url: 'http://localhost:9000/flight-app/tenant-uuid-1/photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 12345,
  createdAt: new Date(),
};

const media2 = {
  id: 'media-uuid-2',
  tenantId: 'tenant-uuid-1',
  filename: 'banner.png',
  s3Key: 'tenant-uuid-1/banner.png',
  url: 'http://localhost:9000/flight-app/tenant-uuid-1/banner.png',
  mimeType: 'image/png',
  sizeBytes: 67890,
  createdAt: new Date(),
};

function makeRequest(
  url: string,
  options: { method?: string; body?: FormData | null; cookies?: Record<string, string> } = {},
): NextRequest {
  const { method = 'GET', body, cookies = {} } = options;
  const req = new NextRequest(url, {
    method,
    ...(body !== undefined && body !== null ? { body } : {}),
  });
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function withSession(
  url: string,
  options: { method?: string; body?: FormData | null } = {},
): NextRequest {
  return makeRequest(url, { ...options, cookies: { session: FAKE_TOKEN } });
}

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret';
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
});

afterAll(() => {
  delete process.env.SESSION_SECRET;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
});

describe('POST /api/admin/media', () => {
  it('uploads file to S3, saves media record to DB, and returns 201 with media object', async () => {
    const newMedia = { ...media1, id: 'media-uuid-new' };
    mockUploadFile.mockResolvedValue({
      key: 'tenant-uuid-1/photo.jpg',
      url: 'http://localhost:9000/flight-app/tenant-uuid-1/photo.jpg',
    });
    mockCreateMedia.mockResolvedValue(newMedia);

    const { POST } = await import('@/app/api/admin/media/route');

    const formData = new FormData();
    formData.append('tenantId', 'tenant-uuid-1');
    formData.append('file', new File(['file content'], 'photo.jpg', { type: 'image/jpeg' }));

    const response = await POST(
      withSession('http://localhost/api/admin/media', { method: 'POST', body: formData }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.tenantId).toBe('tenant-uuid-1');
    expect(mockUploadFile).toHaveBeenCalledWith(
      'tenant-uuid-1',
      expect.any(Buffer),
      'photo.jpg',
      'image/jpeg',
    );
    expect(mockCreateMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-uuid-1',
        filename: 'photo.jpg',
        s3Key: 'tenant-uuid-1/photo.jpg',
        mimeType: 'image/jpeg',
      }),
    );
  });

  it('returns 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/admin/media/route');

    const formData = new FormData();
    formData.append('tenantId', 'tenant-uuid-1');
    formData.append('file', new File(['content'], 'photo.jpg', { type: 'image/jpeg' }));

    const response = await POST(
      makeRequest('http://localhost/api/admin/media', { method: 'POST', body: formData }),
    );

    expect(response.status).toBe(401);
  });
});

describe('GET /api/admin/media', () => {
  it('returns paginated media for tenant with data array and total count', async () => {
    mockGetMediaByTenant.mockResolvedValue({ data: [media1, media2], total: 2 });
    const { GET } = await import('@/app/api/admin/media/route');

    const response = await GET(
      withSession('http://localhost/api/admin/media?tenantId=tenant-uuid-1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body.total).toBe(2);
    expect(body.data.every((m: { tenantId: string }) => m.tenantId === 'tenant-uuid-1')).toBe(true);
    expect(mockGetMediaByTenant).toHaveBeenCalledWith('tenant-uuid-1', expect.any(Object));
  });

  it('paginates correctly with limit and offset', async () => {
    mockGetMediaByTenant.mockResolvedValue({ data: [media1], total: 2 });
    const { GET } = await import('@/app/api/admin/media/route');

    const response = await GET(
      withSession('http://localhost/api/admin/media?tenantId=tenant-uuid-1&limit=1&offset=0'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(mockGetMediaByTenant).toHaveBeenCalledWith(
      'tenant-uuid-1',
      expect.objectContaining({ limit: 1, offset: 0 }),
    );
  });

  it('returns 401 without auth cookie', async () => {
    const { GET } = await import('@/app/api/admin/media/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/media?tenantId=tenant-uuid-1'),
    );

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/admin/media/[id]', () => {
  it('removes DB record and S3 object, returns 200', async () => {
    mockGetMediaById.mockResolvedValue(media1);
    mockDeleteFile.mockResolvedValue(undefined);
    mockDeleteMedia.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/admin/media/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/media/media-uuid-1', { method: 'DELETE' }),
      { params: { id: 'media-uuid-1' } },
    );

    expect(response.status).toBe(200);
    expect(mockDeleteFile).toHaveBeenCalledWith('tenant-uuid-1/photo.jpg');
    expect(mockDeleteMedia).toHaveBeenCalledWith('media-uuid-1');
  });

  it('returns 404 for a non-existent media ID', async () => {
    mockGetMediaById.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/admin/media/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/media/non-existent', { method: 'DELETE' }),
      { params: { id: 'non-existent' } },
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without auth cookie', async () => {
    const { DELETE } = await import('@/app/api/admin/media/[id]/route');

    const response = await DELETE(
      makeRequest('http://localhost/api/admin/media/media-uuid-1', { method: 'DELETE' }),
      { params: { id: 'media-uuid-1' } },
    );

    expect(response.status).toBe(401);
  });
});
