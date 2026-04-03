// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());
const MockImageResponse = vi.hoisted(
  () =>
    class {
      private body: string;
      readonly headers: Headers;

      constructor(_element: unknown, _options?: { width?: number; height?: number }) {
        this.body = 'PNG_IMAGE_DATA';
        this.headers = new Headers({ 'Content-Type': 'image/png' });
      }

      async arrayBuffer() {
        return new TextEncoder().encode(this.body).buffer;
      }

      async text() {
        return this.body;
      }
    },
);

vi.mock('next/og', () => ({
  ImageResponse: MockImageResponse,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: mockResolveTenant,
}));

const fakeTenant = {
  id: 'tenant-uuid-1',
  name: 'Acme Corp',
  slug: 'acme',
  customDomain: null,
  theme: {
    colors: {
      primary: '#2563EB',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#111827',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    logo: 'https://example.com/logo.png',
  },
};

function makeHeadersMap(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  return { get: (key: string) => map.get(key) ?? null };
}

// The route is imported dynamically inside each test to match the established pattern
// used in other API route tests (e.g. tests/unit/api/admin/blog.test.ts), which
// ensures the hoisted mocks are in place before the module is evaluated.

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockReturnValue(makeHeadersMap({ host: 'acme.localhost' }));
  mockResolveTenant.mockResolvedValue(fakeTenant);
});

describe('GET /api/og', () => {
  it('returns a response with Content-Type image/png', async () => {
    const { GET } = await import('@/app/(tenant)/api/og/route');

    const request = new Request('http://acme.localhost/api/og?title=Hello');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toContain('image/png');
  });

  it('accepts title query param and resolves the tenant from the request hostname', async () => {
    const { GET } = await import('@/app/(tenant)/api/og/route');

    const request = new Request('http://acme.localhost/api/og?title=My+Page');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toContain('image/png');
    // Tenant is resolved from the hostname header, not from a query param
    expect(mockResolveTenant).toHaveBeenCalledWith('acme.localhost');
  });

  it('returns a valid image response even when params are missing (uses defaults)', async () => {
    mockResolveTenant.mockResolvedValue(null);

    const { GET } = await import('@/app/(tenant)/api/og/route');

    const request = new Request('http://localhost/api/og');
    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toContain('image/png');
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });
});
