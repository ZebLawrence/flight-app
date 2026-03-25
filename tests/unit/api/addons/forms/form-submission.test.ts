// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetTenantByHost = vi.hoisted(() => vi.fn());
const mockGetTenantAddons = vi.hoisted(() => vi.fn());

vi.mock('@/lib/rate-limit', () => ({
  FORM_SUBMISSION_RATE_LIMIT: { windowMs: 60_000, maxRequests: 5 },
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('@/lib/db/queries/tenants', () => ({
  getTenantByHost: mockGetTenantByHost,
}));

vi.mock('@/lib/db/queries/addons', () => ({
  getTenantAddons: mockGetTenantAddons,
}));

const TENANT = {
  id: 'tenant-uuid-1',
  name: 'Test Tenant',
  slug: 'test-tenant',
  customDomain: null,
  theme: {},
  enabledAddons: ['forms'],
  isTemplate: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FORM_ID = 'contact';

const FORMS_ADDON_CONFIG_ENABLED = {
  tenantId: TENANT.id,
  addonKey: 'forms',
  enabled: true,
  config: {
    forms: {
      [FORM_ID]: {
        recipientEmail: 'owner@example.com',
        successRedirect: '/thank-you',
        fields: [
          { name: 'name', required: true },
          { name: 'email', required: true },
          { name: 'message', required: false },
        ],
      },
    },
  },
};

const FORMS_ADDON_CONFIG_DISABLED = {
  ...FORMS_ADDON_CONFIG_ENABLED,
  enabled: false,
};

function makeRequest(
  formId: string,
  options: {
    body?: unknown;
    ip?: string;
    host?: string;
  } = {},
): NextRequest {
  const { body, ip = '127.0.0.1', host = 'test-tenant.example.com' } = options;
  return new NextRequest(
    `http://${host}/api/addons/forms/${formId}`,
    {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
        host,
      },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
  mockGetTenantByHost.mockResolvedValue(TENANT);
  mockGetTenantAddons.mockResolvedValue([FORMS_ADDON_CONFIG_ENABLED]);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('POST /api/addons/forms/[formId]', () => {
  it('returns 200 when valid data is submitted and addon is enabled', async () => {
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');

    const response = await POST(
      makeRequest(FORM_ID, {
        body: { name: 'Alice', email: 'alice@example.com', message: 'Hello' },
      }),
      { params: { formId: FORM_ID } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  it('returns 403 when forms addon is disabled for the tenant', async () => {
    mockGetTenantAddons.mockResolvedValue([FORMS_ADDON_CONFIG_DISABLED]);
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');

    const response = await POST(
      makeRequest(FORM_ID, {
        body: { name: 'Alice', email: 'alice@example.com' },
      }),
      { params: { formId: FORM_ID } },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');

    const response = await POST(
      makeRequest(FORM_ID, {
        body: { message: 'Hello, missing name and email!' },
      }),
      { params: { formId: FORM_ID } },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('fields');
    expect(body.fields).toContain('name');
    expect(body.fields).toContain('email');
  });

  it('returns 404 when the tenant is unknown', async () => {
    mockGetTenantByHost.mockResolvedValue(null);
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');

    const response = await POST(
      makeRequest(FORM_ID, {
        host: 'unknown-tenant.example.com',
        body: { name: 'Alice', email: 'alice@example.com' },
      }),
      { params: { formId: FORM_ID } },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 404 when the formId is unknown for the tenant', async () => {
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');

    const response = await POST(
      makeRequest('nonexistent-form', {
        body: { name: 'Alice', email: 'alice@example.com' },
      }),
      { params: { formId: 'nonexistent-form' } },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 429 after rapid repeated POST requests from the same IP exceed the limit', async () => {
    const { POST } = await import('@/app/api/addons/forms/[formId]/route');
    const ip = '203.0.113.42';

    let callCount = 0;
    mockCheckRateLimit.mockImplementation(() => {
      callCount++;
      return callCount > 5
        ? { allowed: false, retryAfterSeconds: 30 }
        : { allowed: true, retryAfterSeconds: 0 };
    });

    const makeRateLimitRequest = () =>
      POST(
        makeRequest(FORM_ID, {
          ip,
          body: { name: 'Alice', email: 'alice@example.com' },
        }),
        { params: { formId: FORM_ID } },
      );

    for (let i = 0; i < 5; i++) {
      const res = await makeRateLimitRequest();
      expect(res.status).not.toBe(429);
    }

    const limitedResponse = await makeRateLimitRequest();
    expect(limitedResponse.status).toBe(429);
    const body = await limitedResponse.json();
    expect(body).toHaveProperty('error');
    const retryAfter = limitedResponse.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});
