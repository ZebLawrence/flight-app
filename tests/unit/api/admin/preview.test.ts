// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';
const FAKE_PREVIEW_TOKEN = 'fake.preview.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetPageById = vi.hoisted(() => vi.fn());
const mockGetTenantById = vi.hoisted(() => vi.fn());
const mockGeneratePreviewToken = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/pages', () => ({
  getPageById: mockGetPageById,
}));

vi.mock('@/lib/db/queries/tenants', () => ({
  getTenantById: mockGetTenantById,
}));

vi.mock('@/lib/preview', () => ({
  generatePreviewToken: mockGeneratePreviewToken,
}));

const page1 = {
  id: 'page-uuid-1',
  tenantId: 'tenant-uuid-1',
  slug: 'home',
  title: 'Home',
  content: {},
  published: true,
  sortOrder: 0,
  meta: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tenant1 = {
  id: 'tenant-uuid-1',
  name: 'Acme Corp',
  slug: 'acme',
  customDomain: null,
  theme: {},
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  options: { cookies?: Record<string, string> } = {},
): NextRequest {
  const { cookies = {} } = options;
  const req = new NextRequest(url, { method: 'GET' });
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function withSession(url: string): NextRequest {
  return makeRequest(url, { cookies: { session: FAKE_TOKEN } });
}

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret';
  process.env.PREVIEW_SECRET = 'preview-secret';
  process.env.PLATFORM_DOMAIN = 'example.com';
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
  mockGeneratePreviewToken.mockReturnValue(FAKE_PREVIEW_TOKEN);
});

afterAll(() => {
  delete process.env.SESSION_SECRET;
  delete process.env.PREVIEW_SECRET;
  delete process.env.PLATFORM_DOMAIN;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
  mockGeneratePreviewToken.mockReturnValue(FAKE_PREVIEW_TOKEN);
});

describe('GET /api/admin/preview', () => {
  it('returns 302 redirect with ?preview= param in URL for valid pageId and auth session', async () => {
    mockGetPageById.mockResolvedValue(page1);
    mockGetTenantById.mockResolvedValue(tenant1);
    const { GET } = await import('@/app/api/admin/preview/route');

    const response = await GET(
      withSession('http://localhost/api/admin/preview?pageId=page-uuid-1'),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toContain('?preview=');
    expect(location).toContain(FAKE_PREVIEW_TOKEN);
    expect(location).toContain('acme.example.com');
    expect(location).toContain('/home');
    expect(mockGeneratePreviewToken).toHaveBeenCalledWith('page-uuid-1', 'tenant-uuid-1');
  });

  it('returns 401 without auth session', async () => {
    const { GET } = await import('@/app/api/admin/preview/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/preview?pageId=page-uuid-1'),
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 for non-existent pageId', async () => {
    mockGetPageById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/preview/route');

    const response = await GET(
      withSession('http://localhost/api/admin/preview?pageId=non-existent'),
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when page exists but tenant does not', async () => {
    mockGetPageById.mockResolvedValue(page1);
    mockGetTenantById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/preview/route');

    const response = await GET(
      withSession('http://localhost/api/admin/preview?pageId=page-uuid-1'),
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 when pageId query param is missing', async () => {
    const { GET } = await import('@/app/api/admin/preview/route');

    const response = await GET(
      withSession('http://localhost/api/admin/preview'),
    );

    expect(response.status).toBe(400);
  });
});
