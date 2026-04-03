// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: mockResolveTenant,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

const tenant = {
  id: 'tenant-uuid-1',
  name: 'Acme Corp',
  slug: 'acme',
  customDomain: null,
};

function makeHeadersMap(host: string) {
  const map = new Map<string, string>([['host', host]]);
  return { get: (key: string) => map.get(key) ?? null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockReturnValue(makeHeadersMap('acme.example.com'));
  mockResolveTenant.mockResolvedValue(tenant);
});

describe('GET /robots.txt', () => {
  it('output contains User-agent: *', async () => {
    const { GET } = await import('@/app/(tenant)/robots.txt/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('User-agent: *');
  });

  it('output contains Allow: /', async () => {
    const { GET } = await import('@/app/(tenant)/robots.txt/route');
    const response = await GET();

    const text = await response.text();
    expect(text).toContain('Allow: /');
  });

  it('output contains Sitemap: directive pointing to tenant sitemap URL', async () => {
    const { GET } = await import('@/app/(tenant)/robots.txt/route');
    const response = await GET();

    const text = await response.text();
    expect(text).toContain('Sitemap: https://acme.example.com/sitemap.xml');
  });

  it('output disallows /admin and /api', async () => {
    const { GET } = await import('@/app/(tenant)/robots.txt/route');
    const response = await GET();

    const text = await response.text();
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /api');
  });
});
