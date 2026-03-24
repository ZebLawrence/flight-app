// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockListTenants = vi.hoisted(() => vi.fn());
const mockCreateTenant = vi.hoisted(() => vi.fn());
const mockGetTenantById = vi.hoisted(() => vi.fn());
const mockUpdateTenant = vi.hoisted(() => vi.fn());
const mockDeleteTenant = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/tenants', () => ({
  listTenants: mockListTenants,
  createTenant: mockCreateTenant,
  getTenantById: mockGetTenantById,
  updateTenant: mockUpdateTenant,
  deleteTenant: mockDeleteTenant,
}));

const tenant1 = {
  id: 'uuid-1',
  name: 'Tenant One',
  slug: 'tenant-one',
  customDomain: null,
  theme: {},
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tenant2 = {
  id: 'uuid-2',
  name: 'Tenant Two',
  slug: 'tenant-two',
  customDomain: null,
  theme: {},
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tenant3 = {
  id: 'uuid-3',
  name: 'Tenant Three',
  slug: 'tenant-three',
  customDomain: null,
  theme: {},
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const allTenants = [tenant1, tenant2, tenant3];

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

describe('GET /api/admin/tenants', () => {
  it('returns JSON with data array and total count', async () => {
    mockListTenants.mockResolvedValue({ data: allTenants, total: 3 });
    const { GET } = await import('@/app/api/admin/tenants/route');

    const response = await GET(withSession('http://localhost/api/admin/tenants'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBe(3);
  });

  it('returns 401 without auth cookie', async () => {
    const { GET } = await import('@/app/api/admin/tenants/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/tenants'),
    );

    expect(response.status).toBe(401);
  });

  it('GET with ?limit=2 returns at most 2 tenants in data', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1, tenant2], total: 3 });
    const { GET } = await import('@/app/api/admin/tenants/route');

    const response = await GET(
      withSession('http://localhost/api/admin/tenants?limit=2'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(mockListTenants).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
  });

  it('GET with ?offset=1 skips the first tenant', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant2, tenant3], total: 3 });
    const { GET } = await import('@/app/api/admin/tenants/route');

    const response = await GET(
      withSession('http://localhost/api/admin/tenants?offset=1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mockListTenants).toHaveBeenCalledWith(expect.objectContaining({ offset: 1 }));
    expect(body.data[0].id).toBe(tenant2.id);
  });

  it('GET returns correct total regardless of limit/offset', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1], total: 3 });
    const { GET } = await import('@/app/api/admin/tenants/route');

    const response = await GET(
      withSession('http://localhost/api/admin/tenants?limit=1&offset=0'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(3);
    expect(body.data.length).toBe(1);
  });
});

describe('POST /api/admin/tenants', () => {
  it('creates tenant and returns 201 with tenant object', async () => {
    const newTenant = { ...tenant1, id: 'uuid-new', name: 'New Tenant', slug: 'new-tenant' };
    mockCreateTenant.mockResolvedValue(newTenant);
    const { POST } = await import('@/app/api/admin/tenants/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants', {
        method: 'POST',
        body: { name: 'New Tenant', slug: 'new-tenant' },
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.slug).toBe('new-tenant');
    expect(body.name).toBe('New Tenant');
  });

  it('returns 409 for duplicate slug', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockCreateTenant.mockRejectedValue(duplicateError);
    const { POST } = await import('@/app/api/admin/tenants/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants', {
        method: 'POST',
        body: { name: 'Tenant One', slug: 'tenant-one' },
      }),
    );

    expect(response.status).toBe(409);
  });

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/admin/tenants/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants', {
        method: 'POST',
        body: { name: 'No Slug' },
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/admin/tenants/route');

    const response = await POST(
      makeRequest('http://localhost/api/admin/tenants', {
        method: 'POST',
        body: { name: 'Test', slug: 'test' },
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe('PUT /api/admin/tenants/[id]', () => {
  it('returns 200 with updated tenant when body is valid', async () => {
    const updatedTenant = { ...tenant1, name: 'Updated Name' };
    mockUpdateTenant.mockResolvedValue(updatedTenant);
    const { PUT } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/tenants/uuid-1', {
        method: 'PUT',
        body: { name: 'Updated Name' },
      }),
      { params: { id: 'uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Updated Name');
    expect(mockUpdateTenant).toHaveBeenCalledWith('uuid-1', expect.objectContaining({ name: 'Updated Name' }));
  });

  it('returns 404 for non-existent tenant ID', async () => {
    mockUpdateTenant.mockRejectedValue(new Error('Tenant with id "non-existent" not found'));
    const { PUT } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/tenants/non-existent', {
        method: 'PUT',
        body: { name: 'New Name' },
      }),
      { params: { id: 'non-existent' } },
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without auth cookie', async () => {
    const { PUT } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await PUT(
      makeRequest('http://localhost/api/admin/tenants/uuid-1', {
        method: 'PUT',
        body: { name: 'Name' },
      }),
      { params: { id: 'uuid-1' } },
    );

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/admin/tenants/[id]', () => {
  it('removes tenant and returns 200; deleteTenant called with correct id', async () => {
    mockGetTenantById.mockResolvedValue(tenant1);
    mockDeleteTenant.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/tenants/uuid-1', { method: 'DELETE' }),
      { params: { id: 'uuid-1' } },
    );

    expect(response.status).toBe(200);
    expect(mockDeleteTenant).toHaveBeenCalledWith('uuid-1');
  });

  it('returns 404 for non-existent tenant ID', async () => {
    mockGetTenantById.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/tenants/no-such-id', { method: 'DELETE' }),
      { params: { id: 'no-such-id' } },
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without auth cookie', async () => {
    const { DELETE } = await import('@/app/api/admin/tenants/[id]/route');

    const response = await DELETE(
      makeRequest('http://localhost/api/admin/tenants/uuid-1', { method: 'DELETE' }),
      { params: { id: 'uuid-1' } },
    );

    expect(response.status).toBe(401);
  });
});
