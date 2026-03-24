// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

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
