// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetPagesByTenant = vi.hoisted(() => vi.fn());
const mockCreatePage = vi.hoisted(() => vi.fn());
const mockUpdatePage = vi.hoisted(() => vi.fn());
const mockDeletePage = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/pages', () => ({
  getPagesByTenant: mockGetPagesByTenant,
  createPage: mockCreatePage,
  updatePage: mockUpdatePage,
  deletePage: mockDeletePage,
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

const page2 = {
  id: 'page-uuid-2',
  tenantId: 'tenant-uuid-1',
  slug: 'about',
  title: 'About',
  content: {},
  published: true,
  sortOrder: 1,
  meta: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const page3 = {
  id: 'page-uuid-3',
  tenantId: 'tenant-uuid-2',
  slug: 'home',
  title: 'Other Tenant Home',
  content: {},
  published: true,
  sortOrder: 0,
  meta: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; cookies?: Record<string, string> } = {},
): NextRequest {
  const { method = 'GET', body, cookies = {} } = options;
  const req = new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  });
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function withSession(
  url: string,
  options: { method?: string; body?: unknown } = {},
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

describe('GET /api/admin/pages', () => {
  it('returns pages scoped to tenantId only (not other tenants)', async () => {
    mockGetPagesByTenant.mockResolvedValue({ data: [page1, page2], total: 2 });
    const { GET } = await import('@/app/api/admin/pages/route');

    const response = await GET(
      withSession('http://localhost/api/admin/pages?tenantId=tenant-uuid-1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body.total).toBe(2);
    // Ensure only pages for tenant-uuid-1 are returned, not page3 (tenant-uuid-2)
    expect(body.data.every((p: { tenantId: string }) => p.tenantId === 'tenant-uuid-1')).toBe(true);
    expect(mockGetPagesByTenant).toHaveBeenCalledWith('tenant-uuid-1', expect.any(Object));
  });

  it('returns 400 when tenantId is missing', async () => {
    const { GET } = await import('@/app/api/admin/pages/route');

    const response = await GET(withSession('http://localhost/api/admin/pages'));

    expect(response.status).toBe(400);
  });

  it('paginates results with limit and offset', async () => {
    mockGetPagesByTenant.mockResolvedValue({ data: [page1], total: 2 });
    const { GET } = await import('@/app/api/admin/pages/route');

    const response = await GET(
      withSession('http://localhost/api/admin/pages?tenantId=tenant-uuid-1&limit=1&offset=0'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(mockGetPagesByTenant).toHaveBeenCalledWith(
      'tenant-uuid-1',
      expect.objectContaining({ limit: 1, offset: 0 }),
    );
  });

  it('returns correct total count regardless of limit/offset', async () => {
    mockGetPagesByTenant.mockResolvedValue({ data: [page2], total: 2 });
    const { GET } = await import('@/app/api/admin/pages/route');

    const response = await GET(
      withSession('http://localhost/api/admin/pages?tenantId=tenant-uuid-1&limit=1&offset=1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(2);
    expect(body.data.length).toBe(1);
  });

  it('returns 401 without auth cookie', async () => {
    const { GET } = await import('@/app/api/admin/pages/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/pages?tenantId=tenant-uuid-1'),
    );

    expect(response.status).toBe(401);
  });
});

describe('POST /api/admin/pages', () => {
  it('creates page with correct tenant FK and returns 201', async () => {
    const newPage = { ...page1, id: 'page-uuid-new' };
    mockCreatePage.mockResolvedValue(newPage);
    const { POST } = await import('@/app/api/admin/pages/route');

    const response = await POST(
      withSession('http://localhost/api/admin/pages', {
        method: 'POST',
        body: { tenantId: 'tenant-uuid-1', slug: 'home', title: 'Home' },
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.tenantId).toBe('tenant-uuid-1');
    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-uuid-1', slug: 'home', title: 'Home' }),
    );
  });

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/admin/pages/route');

    const response = await POST(
      withSession('http://localhost/api/admin/pages', {
        method: 'POST',
        body: { slug: 'home', title: 'Home' },
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/admin/pages/route');

    const response = await POST(
      makeRequest('http://localhost/api/admin/pages', {
        method: 'POST',
        body: { tenantId: 'tenant-uuid-1', slug: 'home', title: 'Home' },
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe('PUT /api/admin/pages/[id]', () => {
  it('updates page content and title; returns 200', async () => {
    const updatedPage = { ...page1, title: 'New Title', content: { blocks: [] } };
    mockUpdatePage.mockResolvedValue(updatedPage);
    const { PUT } = await import('@/app/api/admin/pages/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/pages/page-uuid-1', {
        method: 'PUT',
        body: { title: 'New Title', content: { blocks: [] } },
      }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('New Title');
    expect(mockUpdatePage).toHaveBeenCalledWith(
      'page-uuid-1',
      expect.objectContaining({ title: 'New Title', content: { blocks: [] } }),
    );
  });

  it('returns 404 for non-existent page ID', async () => {
    mockUpdatePage.mockRejectedValue(new Error('Page with id "non-existent" not found'));
    const { PUT } = await import('@/app/api/admin/pages/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/pages/non-existent', {
        method: 'PUT',
        body: { title: 'Test' },
      }),
      { params: { id: 'non-existent' } },
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without auth cookie', async () => {
    const { PUT } = await import('@/app/api/admin/pages/[id]/route');

    const response = await PUT(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1', {
        method: 'PUT',
        body: { title: 'Test' },
      }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/admin/pages/[id]', () => {
  it('removes page and returns 200; deletePage called with correct id', async () => {
    mockDeletePage.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/admin/pages/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/pages/page-uuid-1', { method: 'DELETE' }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(200);
    expect(mockDeletePage).toHaveBeenCalledWith('page-uuid-1');
  });

  it('returns 401 without auth cookie', async () => {
    const { DELETE } = await import('@/app/api/admin/pages/[id]/route');

    const response = await DELETE(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1', { method: 'DELETE' }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(401);
  });
});
