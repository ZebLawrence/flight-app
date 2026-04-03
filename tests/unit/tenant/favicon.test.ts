// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: mockResolveTenant,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

const defaultFaviconBytes = Buffer.from([0x00, 0x00, 0x01, 0x00]);

function makeHeadersMap(host: string) {
  const map = new Map<string, string>([['host', host]]);
  return { get: (key: string) => map.get(key) ?? null };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockHeaders.mockReturnValue(makeHeadersMap('localhost'));
  mockReadFile.mockResolvedValue(defaultFaviconBytes);
});

describe('GET /favicon.ico', () => {
  it('redirects (302) to tenant favicon URL when theme.favicon is set', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      customDomain: null,
      theme: { favicon: 'https://cdn.example.com/acme-favicon.ico' },
    });

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      'https://cdn.example.com/acme-favicon.ico',
    );
  });

  it('serves default platform favicon when tenant has no favicon in theme', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      customDomain: null,
      theme: { colors: { primary: '#000' } },
    });

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/x-icon');
    const body = await response.arrayBuffer();
    expect(Buffer.from(body)).toEqual(defaultFaviconBytes);
  });

  it('serves default platform favicon when tenant is not found', async () => {
    mockResolveTenant.mockResolvedValue(null);

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/x-icon');
    const body = await response.arrayBuffer();
    expect(Buffer.from(body)).toEqual(defaultFaviconBytes);
  });

  it('serves default platform favicon when tenant theme is null', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      customDomain: null,
      theme: null,
    });

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/x-icon');
  });

  it('resolves tenant from x-request-hostname header', async () => {
    mockHeaders.mockReturnValue({
      get: (key: string) => {
        if (key === 'x-request-hostname') return 'acme.example.com';
        return null;
      },
    });
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      customDomain: 'acme.example.com',
      theme: { favicon: 'https://cdn.example.com/favicon.png' },
    });

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(mockResolveTenant).toHaveBeenCalledWith('acme.example.com');
    expect(response.status).toBe(302);
  });

  it('default favicon response includes Cache-Control header', async () => {
    mockResolveTenant.mockResolvedValue(null);

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age=86400');
  });

  it('returns 404 when default favicon file is missing', async () => {
    mockResolveTenant.mockResolvedValue(null);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const { GET } = await import('@/app/(tenant)/favicon.ico/route');
    const response = await GET();

    expect(response.status).toBe(404);
  });
});
