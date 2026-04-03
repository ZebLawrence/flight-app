// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockRevalidateTag = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('next/cache', () => ({
  revalidateTag: mockRevalidateTag,
}));

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
});

afterAll(() => {
  delete process.env.SESSION_SECRET;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
});

describe('POST /api/admin/revalidate', () => {
  it('returns 200 and revalidates cache for a valid tenantId', async () => {
    const { POST } = await import('@/app/api/admin/revalidate/route');

    const response = await POST(
      withSession('http://localhost/api/admin/revalidate', {
        method: 'POST',
        body: { tenantId: 'tenant-uuid-1' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ revalidated: true, tenantId: 'tenant-uuid-1' });
    expect(mockRevalidateTag).toHaveBeenCalledWith('tenant-tenant-uuid-1');
  });

  it('returns 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/admin/revalidate/route');

    const response = await POST(
      makeRequest('http://localhost/api/admin/revalidate', {
        method: 'POST',
        body: { tenantId: 'tenant-uuid-1' },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('returns 400 when tenantId is missing', async () => {
    const { POST } = await import('@/app/api/admin/revalidate/route');

    const response = await POST(
      withSession('http://localhost/api/admin/revalidate', {
        method: 'POST',
        body: {},
      }),
    );

    expect(response.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
