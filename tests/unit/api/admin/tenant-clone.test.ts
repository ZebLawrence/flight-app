// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetTenantById = vi.hoisted(() => vi.fn());
const mockCreateTenant = vi.hoisted(() => vi.fn());
const mockGetPagesByTenant = vi.hoisted(() => vi.fn());
const mockCreatePage = vi.hoisted(() => vi.fn());
const mockGetTenantAddons = vi.hoisted(() => vi.fn());
const mockCreateTenantAddonConfig = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/tenants', () => ({
  getTenantById: mockGetTenantById,
  createTenant: mockCreateTenant,
}));

vi.mock('@/lib/db/queries/pages', () => ({
  getPagesByTenant: mockGetPagesByTenant,
  createPage: mockCreatePage,
}));

vi.mock('@/lib/db/queries/addons', () => ({
  getTenantAddons: mockGetTenantAddons,
  createTenantAddonConfig: mockCreateTenantAddonConfig,
}));

const sourceTenant = {
  id: 'source-uuid',
  name: 'Source Tenant',
  slug: 'source-tenant',
  customDomain: null,
  theme: { primaryColor: '#ff0000', font: 'sans-serif' },
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sourcePage1 = {
  id: 'page-uuid-1',
  tenantId: 'source-uuid',
  slug: 'home',
  title: 'Home',
  content: { blocks: [{ type: 'hero', text: 'Welcome' }] },
  published: true,
  sortOrder: 0,
  meta: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sourcePage2 = {
  id: 'page-uuid-2',
  tenantId: 'source-uuid',
  slug: 'about',
  title: 'About',
  content: { blocks: [{ type: 'text', text: 'About us' }] },
  published: true,
  sortOrder: 1,
  meta: { description: 'About page' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sourceAddon = {
  tenantId: 'source-uuid',
  addonKey: 'analytics',
  config: { trackingId: 'UA-12345' },
  enabled: true,
};

const clonedTenant = {
  id: 'cloned-uuid',
  name: 'Cloned Tenant',
  slug: 'cloned-tenant',
  customDomain: null,
  theme: sourceTenant.theme,
  enabledAddons: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; cookies?: Record<string, string> } = {},
): NextRequest {
  const { method = 'POST', body, cookies = {} } = options;
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

describe('POST /api/admin/tenants/[id]/clone', () => {
  it('creates a new tenant with the specified name and slug', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    mockCreateTenant.mockResolvedValue(clonedTenant);
    mockGetPagesByTenant.mockResolvedValue({ data: [], total: 0 });
    mockGetTenantAddons.mockResolvedValue([]);
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe('Cloned Tenant');
    expect(body.slug).toBe('cloned-tenant');
    expect(mockCreateTenant).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cloned Tenant', slug: 'cloned-tenant' }),
    );
  });

  it('cloned tenant has the same theme JSONB as the source', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    mockCreateTenant.mockResolvedValue(clonedTenant);
    mockGetPagesByTenant.mockResolvedValue({ data: [], total: 0 });
    mockGetTenantAddons.mockResolvedValue([]);
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(response.status).toBe(201);
    expect(mockCreateTenant).toHaveBeenCalledWith(
      expect.objectContaining({ theme: sourceTenant.theme }),
    );
    const body = await response.json();
    expect(body.theme).toEqual(sourceTenant.theme);
  });

  it('cloned tenant has the same number of pages with identical content', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    mockCreateTenant.mockResolvedValue(clonedTenant);
    mockGetPagesByTenant.mockResolvedValue({ data: [sourcePage1, sourcePage2], total: 2 });
    mockGetTenantAddons.mockResolvedValue([]);
    mockCreatePage.mockResolvedValue({});
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(mockCreatePage).toHaveBeenCalledTimes(2);
    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'home', title: 'Home', content: sourcePage1.content }),
    );
    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'about', title: 'About', content: sourcePage2.content }),
    );
  });

  it('cloned pages are independent — new page records use the new tenant ID', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    mockCreateTenant.mockResolvedValue(clonedTenant);
    mockGetPagesByTenant.mockResolvedValue({ data: [sourcePage1], total: 1 });
    mockGetTenantAddons.mockResolvedValue([]);
    mockCreatePage.mockResolvedValue({});
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: clonedTenant.id }),
    );
    expect(mockCreatePage).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: sourceTenant.id }),
    );
  });

  it('cloned tenant has the same addon configs', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    mockCreateTenant.mockResolvedValue(clonedTenant);
    mockGetPagesByTenant.mockResolvedValue({ data: [], total: 0 });
    mockGetTenantAddons.mockResolvedValue([sourceAddon]);
    mockCreateTenantAddonConfig.mockResolvedValue({});
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(mockCreateTenantAddonConfig).toHaveBeenCalledTimes(1);
    expect(mockCreateTenantAddonConfig).toHaveBeenCalledWith(
      clonedTenant.id,
      sourceAddon.addonKey,
      sourceAddon.config,
      sourceAddon.enabled,
    );
  });

  it('returns 409 for duplicate slug', async () => {
    mockGetTenantById.mockResolvedValue(sourceTenant);
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockCreateTenant.mockRejectedValue(duplicateError);
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    const response = await POST(
      withSession('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'source-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(response.status).toBe(409);
  });

  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/admin/tenants/[id]/clone/route');

    const response = await POST(
      makeRequest('http://localhost/api/admin/tenants/source-uuid/clone', {
        body: { name: 'Cloned Tenant', slug: 'cloned-tenant' },
      }),
      { params: { id: 'source-uuid' } },
    );

    expect(response.status).toBe(401);
  });
});
