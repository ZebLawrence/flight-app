// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPageBySlug = vi.hoisted(() => vi.fn());
const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/queries/pages', () => ({
  getPageBySlug: mockGetPageBySlug,
}));

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: mockResolveTenant,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

function makeHeadersMap(host: string) {
  const map = new Map<string, string>([['host', host]]);
  return { get: (key: string) => map.get(key) ?? null };
}

const basePage = {
  id: 'page-1',
  tenantId: 'tenant-1',
  slug: 'about',
  title: 'About Us',
  published: true,
  meta: null,
  content: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockReturnValue(makeHeadersMap('demo.localhost'));
  mockResolveTenant.mockResolvedValue({
    id: 'tenant-1',
    name: 'Demo Corp',
    slug: 'demo',
    customDomain: null,
  });
  mockGetPageBySlug.mockResolvedValue(basePage);
});

describe('generateMetadata — canonical URL', () => {
  it('uses tenant customDomain when set', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: 'democorp.com',
    });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['about'] }, searchParams: {} });

    expect(metadata.alternates?.canonical).toBe('https://democorp.com/about');
  });

  it('falls back to request hostname when customDomain is null', async () => {
    mockHeaders.mockReturnValue(makeHeadersMap('demo.localhost'));
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: null,
    });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['about'] }, searchParams: {} });

    expect(metadata.alternates?.canonical).toBe('https://demo.localhost/about');
  });

  it('generates canonical URL for nested slug', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: 'democorp.com',
    });
    mockGetPageBySlug.mockResolvedValue({ ...basePage, slug: 'products/widget' });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({
      params: { slug: ['products', 'widget'] },
      searchParams: {},
    });

    expect(metadata.alternates?.canonical).toBe('https://democorp.com/products/widget');
  });

  it('generates canonical URL for root (empty slug)', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: 'democorp.com',
    });
    mockGetPageBySlug.mockResolvedValue({ ...basePage, slug: '' });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: {}, searchParams: {} });

    expect(metadata.alternates?.canonical).toBe('https://democorp.com/');
  });

  it('returns empty metadata when tenant is not found', async () => {
    mockResolveTenant.mockResolvedValue(null);

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['about'] }, searchParams: {} });

    expect(metadata).toEqual({});
  });

  it('returns empty metadata when page is not found', async () => {
    mockGetPageBySlug.mockResolvedValue(null);

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['missing'] }, searchParams: {} });

    expect(metadata).toEqual({});
  });

  it('returns empty metadata when page is not published', async () => {
    mockGetPageBySlug.mockResolvedValue({ ...basePage, published: false });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['draft'] }, searchParams: {} });

    expect(metadata).toEqual({});
  });

  it('still returns title and openGraph alongside canonical', async () => {
    mockResolveTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: 'democorp.com',
    });
    mockGetPageBySlug.mockResolvedValue({
      ...basePage,
      meta: { title: 'Custom Title', description: 'Custom desc' },
    });

    const { generateMetadata } = await import(
      '@/app/(tenant)/[[...slug]]/page'
    );
    const metadata = await generateMetadata({ params: { slug: ['about'] }, searchParams: {} });

    expect(metadata.title).toBe('Custom Title');
    expect(metadata.description).toBe('Custom desc');
    expect(metadata.alternates?.canonical).toBe('https://democorp.com/about');
  });
});
