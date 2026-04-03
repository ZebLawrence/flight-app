// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetAddonByKey = vi.hoisted(() => vi.fn());
const mockToggleAddon = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/addons', () => ({
  getAddonByKey: mockGetAddonByKey,
  toggleAddon: mockToggleAddon,
}));

const addonConfig = {
  tenantId: 'tenant-uuid-1',
  addonKey: 'analytics',
  enabled: true,
  config: {},
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

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
});

afterAll(() => {
  delete process.env.SESSION_SECRET;
  vi.restoreAllMocks();
});

describe('POST /api/admin/addons', () => {
  it('creates/updates config row with enabled = true', async () => {
    mockGetAddonByKey.mockResolvedValue({ key: 'analytics', name: 'Analytics' });
    mockToggleAddon.mockResolvedValue({ ...addonConfig, enabled: true });

    const { POST } = await import('@/app/api/admin/addons/route');
    const req = withSession('http://localhost/api/admin/addons', {
      body: { tenantId: 'tenant-uuid-1', addonKey: 'analytics', enabled: true },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.enabled).toBe(true);
    expect(mockToggleAddon).toHaveBeenCalledWith('tenant-uuid-1', 'analytics', true);
  });

  it('sets enabled = false when toggling off', async () => {
    mockGetAddonByKey.mockResolvedValue({ key: 'analytics', name: 'Analytics' });
    mockToggleAddon.mockResolvedValue({ ...addonConfig, enabled: false });

    const { POST } = await import('@/app/api/admin/addons/route');
    const req = withSession('http://localhost/api/admin/addons', {
      body: { tenantId: 'tenant-uuid-1', addonKey: 'analytics', enabled: false },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.enabled).toBe(false);
    expect(mockToggleAddon).toHaveBeenCalledWith('tenant-uuid-1', 'analytics', false);
  });

  it('returns 404 for unknown addon key', async () => {
    mockGetAddonByKey.mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/addons/route');
    const req = withSession('http://localhost/api/admin/addons', {
      body: { tenantId: 'tenant-uuid-1', addonKey: 'unknown-addon', enabled: true },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBeDefined();
    expect(mockToggleAddon).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const { POST } = await import('@/app/api/admin/addons/route');
    const req = makeRequest('http://localhost/api/admin/addons', {
      body: { tenantId: 'tenant-uuid-1', addonKey: 'analytics', enabled: true },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBeDefined();
  });
});
