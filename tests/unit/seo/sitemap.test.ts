// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPagesByTenant = vi.hoisted(() => vi.fn());
const mockGetPostsByTenant = vi.hoisted(() => vi.fn());
const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/queries/pages', () => ({
  getPagesByTenant: mockGetPagesByTenant,
}));

vi.mock('@/lib/db/queries/blog-posts', () => ({
  getPostsByTenant: mockGetPostsByTenant,
}));

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

const now = new Date('2024-06-01T10:00:00Z');

const publishedPage = {
  id: 'page-1',
  tenantId: 'tenant-uuid-1',
  slug: 'about',
  title: 'About',
  content: {},
  published: true,
  sortOrder: 0,
  meta: null,
  createdAt: now,
  updatedAt: now,
};

const unpublishedPage = {
  id: 'page-2',
  tenantId: 'tenant-uuid-1',
  slug: 'draft-page',
  title: 'Draft Page',
  content: {},
  published: false,
  sortOrder: 1,
  meta: null,
  createdAt: now,
  updatedAt: now,
};

const publishedPost = {
  id: 'post-1',
  tenantId: 'tenant-uuid-1',
  slug: 'hello-world',
  title: 'Hello World',
  excerpt: 'A great post',
  content: '# Hello',
  tags: [],
  author: 'Alice',
  featuredImage: null,
  published: true,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockReturnValue(makeHeadersMap('localhost'));
  mockResolveTenant.mockResolvedValue(tenant);
  mockGetPagesByTenant.mockResolvedValue({ data: [], total: 0 });
  mockGetPostsByTenant.mockResolvedValue({ data: [], total: 0 });
});

describe('GET /sitemap.xml', () => {
  it('generated XML contains <urlset> root element', async () => {
    const { GET } = await import('@/app/(tenant)/sitemap.xml/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('</urlset>');
    const contentType = response.headers.get('Content-Type');
    expect(contentType).toContain('application/xml');
  });

  it('each published page produces <url> with <loc> and <lastmod>', async () => {
    mockGetPagesByTenant.mockResolvedValue({ data: [publishedPage], total: 1 });

    const { GET } = await import('@/app/(tenant)/sitemap.xml/route');
    const response = await GET();
    const text = await response.text();

    expect(text).toContain('<url>');
    expect(text).toContain('<loc>http://localhost/about</loc>');
    expect(text).toContain(`<lastmod>${now.toISOString()}</lastmod>`);
  });

  it('each published blog post produces <url>', async () => {
    mockGetPostsByTenant.mockResolvedValue({ data: [publishedPost], total: 1 });

    const { GET } = await import('@/app/(tenant)/sitemap.xml/route');
    const response = await GET();
    const text = await response.text();

    expect(text).toContain('<url>');
    expect(text).toContain('<loc>http://localhost/blog/hello-world</loc>');
    expect(text).toContain(`<lastmod>${now.toISOString()}</lastmod>`);
  });

  it('unpublished/draft pages are excluded', async () => {
    mockGetPagesByTenant.mockResolvedValue({
      data: [publishedPage, unpublishedPage],
      total: 2,
    });

    const { GET } = await import('@/app/(tenant)/sitemap.xml/route');
    const response = await GET();
    const text = await response.text();

    expect(text).toContain('/about');
    expect(text).not.toContain('/draft-page');
    // getPostsByTenant is called with published:true so drafts excluded at query layer
    expect(mockGetPostsByTenant).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ published: true }),
    );
  });

  it('tenant with no published content produces valid XML with zero URLs', async () => {
    const { GET } = await import('@/app/(tenant)/sitemap.xml/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('</urlset>');
    expect(text).not.toContain('<url>');
  });
});
