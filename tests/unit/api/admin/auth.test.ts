// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock('@/lib/rate-limit', () => ({
  LOGIN_RATE_LIMIT: { windowMs: 60_000, maxRequests: 5 },
  checkRateLimit: mockCheckRateLimit,
}));

const VALID_EMAIL = 'admin@example.com';
const VALID_PASSWORD = 'correct-horse-battery-staple';
const FAKE_TOKEN = 'fake.jwt.token';

beforeAll(async () => {
  const hash = await bcrypt.hash(VALID_PASSWORD, 10);
  process.env.ADMIN_EMAIL = VALID_EMAIL;
  process.env.ADMIN_PASSWORD_HASH = hash;
  process.env.SESSION_SECRET = 'test-secret-for-unit-tests';
});

afterAll(() => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.SESSION_SECRET;
  vi.restoreAllMocks();
});

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    createSession: vi.fn(() => FAKE_TOKEN),
  };
});

beforeEach(() => {
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
});

describe('POST /api/admin/auth', () => {
  it('returns 200 and sets Set-Cookie header with session token for valid credentials', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');

    const request = new NextRequest('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(FAKE_TOKEN);
    expect(setCookie).toContain('HttpOnly');
  });

  it('returns 401 and no session cookie for invalid credentials', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');

    const request = new NextRequest('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ email: VALID_EMAIL, password: 'wrong-password' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid credentials' });
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeNull();
  });

  it('returns 400 for missing fields', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');

    const request = new NextRequest('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ email: VALID_EMAIL }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Missing fields' });
  });
});

describe('DELETE /api/admin/auth', () => {
  it('returns 200 and clears the session cookie', async () => {
    const { DELETE } = await import('@/app/api/admin/auth/route');

    const response = await DELETE();

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    // Cookie value should be empty or expired
    const hasEmptyValue = setCookie!.includes('session=;') || setCookie!.includes('session=,') || setCookie!.includes('Max-Age=0');
    expect(hasEmptyValue).toBe(true);
  });
});

describe('Rate limiting for POST /api/admin/auth', () => {
  it('returns 429 after exceeding the 5-attempt limit from the same IP', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');
    const ip = '203.0.113.1';

    let callCount = 0;
    mockCheckRateLimit.mockImplementation(() => {
      callCount++;
      return callCount > 5
        ? { allowed: false, retryAfterSeconds: 30 }
        : { allowed: true, retryAfterSeconds: 0 };
    });

    const makeRequest = () =>
      POST(
        new NextRequest('http://localhost/api/admin/auth', {
          method: 'POST',
          body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        }),
      );

    for (let i = 0; i < 5; i++) {
      const res = await makeRequest();
      expect(res.status).not.toBe(429);
    }

    const response = await makeRequest();
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'Too many attempts' });
  });

  it('includes a Retry-After header with a positive integer value in the 429 response', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');

    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 45 });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
      }),
    );

    expect(response.status).toBe(429);
    const retryAfter = response.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number.isInteger(Number(retryAfter))).toBe(true);
  });

  it('does not block requests from a different IP', async () => {
    const { POST } = await import('@/app/api/admin/auth/route');
    const blockedIp = '203.0.113.1';
    const allowedIp = '203.0.113.2';

    mockCheckRateLimit.mockImplementation((ip: string) => {
      if (ip === blockedIp) {
        return { allowed: false, retryAfterSeconds: 30 };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    });

    const blockedResponse = await POST(
      new NextRequest('http://localhost/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': blockedIp },
      }),
    );
    expect(blockedResponse.status).toBe(429);

    const allowedResponse = await POST(
      new NextRequest('http://localhost/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': allowedIp },
      }),
    );
    expect(allowedResponse.status).not.toBe(429);
  });
});
