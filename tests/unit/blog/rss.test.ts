// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPostsByTenant = vi.hoisted(() => vi.fn());
const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());

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

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockReturnValue(makeHeadersMap('localhost'));
  mockResolveTenant.mockResolvedValue(tenant);
});

describe('GET /blog/rss.xml', () => {
  it('generates valid RSS 2.0 XML with required elements', async () => {
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
      publishedAt: new Date('2024-06-01T10:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetPostsByTenant.mockResolvedValue({ data: [publishedPost], total: 1 });

    const { GET } = await import('@/app/(tenant)/blog/rss.xml/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const text = await response.text();

    expect(text).toContain('<rss version="2.0">');
    expect(text).toContain('<channel>');
    expect(text).toContain('</channel>');
    expect(text).toContain('<item>');
    expect(text).toContain('</item>');
    expect(text).toContain('</rss>');
  });

  it('includes all required RSS item fields for each published post', async () => {
    const publishedAt = new Date('2024-06-01T10:00:00Z');
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
      publishedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetPostsByTenant.mockResolvedValue({ data: [publishedPost], total: 1 });

    const { GET } = await import('@/app/(tenant)/blog/rss.xml/route');
    const response = await GET();

    const text = await response.text();

    expect(text).toContain('<title>Hello World</title>');
    expect(text).toContain('<link>http://localhost/blog/hello-world</link>');
    expect(text).toContain('<description>A great post</description>');
    expect(text).toContain(`<pubDate>${publishedAt.toUTCString()}</pubDate>`);
  });

  it('draft posts are excluded from the feed', async () => {
    // The route calls getPostsByTenant with { published: true }, which already
    // excludes drafts at the query layer. Verify the route passes the correct option.
    mockGetPostsByTenant.mockResolvedValue({ data: [], total: 0 });

    const { GET } = await import('@/app/(tenant)/blog/rss.xml/route');
    await GET();

    expect(mockGetPostsByTenant).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ published: true }),
    );
  });

  it('empty blog produces valid RSS with zero items', async () => {
    mockGetPostsByTenant.mockResolvedValue({ data: [], total: 0 });

    const { GET } = await import('@/app/(tenant)/blog/rss.xml/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const text = await response.text();

    expect(text).toContain('<rss version="2.0">');
    expect(text).toContain('<channel>');
    expect(text).toContain('</channel>');
    expect(text).toContain('</rss>');
    expect(text).not.toContain('<item>');

    const contentType = response.headers.get('Content-Type');
    expect(contentType).toContain('application/rss+xml');
  });
});
