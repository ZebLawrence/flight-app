// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetPostsByTenant = vi.hoisted(() => vi.fn());
const mockGetPostById = vi.hoisted(() => vi.fn());
const mockCreatePost = vi.hoisted(() => vi.fn());
const mockUpdatePost = vi.hoisted(() => vi.fn());
const mockDeletePost = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/lib/db/queries/blog-posts', () => ({
  getPostsByTenant: mockGetPostsByTenant,
  getPostById: mockGetPostById,
  createPost: mockCreatePost,
  updatePost: mockUpdatePost,
  deletePost: mockDeletePost,
}));

const post1 = {
  id: 'post-uuid-1',
  tenantId: 'tenant-uuid-1',
  slug: 'my-first-post',
  title: 'My First Post',
  excerpt: 'An excerpt',
  content: '# Hello World',
  tags: ['tag1'],
  author: 'Alice',
  featuredImage: null,
  published: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const post2 = {
  id: 'post-uuid-2',
  tenantId: 'tenant-uuid-1',
  slug: 'second-post',
  title: 'Second Post',
  excerpt: null,
  content: '# Second',
  tags: [],
  author: 'Bob',
  featuredImage: null,
  published: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const post3 = {
  id: 'post-uuid-3',
  tenantId: 'tenant-uuid-2',
  slug: 'other-tenant-post',
  title: 'Other Tenant Post',
  excerpt: null,
  content: '# Other',
  tags: [],
  author: 'Carol',
  featuredImage: null,
  published: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; cookies?: Record<string, string> } = {},
): NextRequest {
  const { method = 'GET', body, cookies = {} } = options;
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
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
});

afterAll(() => {
  delete process.env.SESSION_SECRET;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockImplementation((token: string) => token === FAKE_TOKEN);
  mockGetPostById.mockResolvedValue(post1);
});

describe('GET /api/admin/blog', () => {
  it('returns only posts for the specified tenantId', async () => {
    mockGetPostsByTenant.mockResolvedValue({ data: [post1, post2], total: 2 });
    const { GET } = await import('@/app/api/admin/blog/route');

    const response = await GET(
      withSession('http://localhost/api/admin/blog?tenantId=tenant-uuid-1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body.total).toBe(2);
    expect(body.data.every((p: { tenantId: string }) => p.tenantId === 'tenant-uuid-1')).toBe(true);
    expect(mockGetPostsByTenant).toHaveBeenCalledWith('tenant-uuid-1', expect.any(Object));
  });

  it('paginates results with limit and offset', async () => {
    mockGetPostsByTenant.mockResolvedValue({ data: [post1], total: 2 });
    const { GET } = await import('@/app/api/admin/blog/route');

    const response = await GET(
      withSession('http://localhost/api/admin/blog?tenantId=tenant-uuid-1&limit=1&offset=0'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(mockGetPostsByTenant).toHaveBeenCalledWith(
      'tenant-uuid-1',
      expect.objectContaining({ limit: 1, offset: 0 }),
    );
  });

  it('returns correct total count regardless of limit and offset', async () => {
    mockGetPostsByTenant.mockResolvedValue({ data: [post2], total: 2 });
    const { GET } = await import('@/app/api/admin/blog/route');

    const response = await GET(
      withSession('http://localhost/api/admin/blog?tenantId=tenant-uuid-1&limit=1&offset=1'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(2);
    expect(body.data.length).toBe(1);
  });
});

describe('POST /api/admin/blog', () => {
  it('creates a post with all fields and returns 201', async () => {
    const newPost = { ...post1, id: 'post-uuid-new' };
    mockCreatePost.mockResolvedValue(newPost);
    const { POST } = await import('@/app/api/admin/blog/route');

    const response = await POST(
      withSession('http://localhost/api/admin/blog?tenantId=tenant-uuid-1', {
        method: 'POST',
        body: {
          title: 'My First Post',
          slug: 'my-first-post',
          excerpt: 'An excerpt',
          content: '# Hello World',
          author: 'Alice',
          tags: ['tag1'],
          featured_image: null,
          published: false,
        },
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.slug).toBe('my-first-post');
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-uuid-1',
        slug: 'my-first-post',
        title: 'My First Post',
        author: 'Alice',
      }),
    );
  });

  it('returns 409 when slug already exists for the same tenant', async () => {
    mockCreatePost.mockRejectedValue(new Error('duplicate key value violates unique constraint'));
    const { POST } = await import('@/app/api/admin/blog/route');

    const response = await POST(
      withSession('http://localhost/api/admin/blog?tenantId=tenant-uuid-1', {
        method: 'POST',
        body: {
          title: 'My First Post',
          slug: 'my-first-post',
          content: '# Hello',
          author: 'Alice',
        },
      }),
    );

    expect(response.status).toBe(409);
  });
});

describe('PUT /api/admin/blog/[id]', () => {
  it('updates post fields including Markdown content', async () => {
    const updatedPost = { ...post1, title: 'Updated Title', content: '## Updated' };
    mockUpdatePost.mockResolvedValue(updatedPost);
    const { PUT } = await import('@/app/api/admin/blog/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/blog/post-uuid-1', {
        method: 'PUT',
        body: { title: 'Updated Title', content: '## Updated' },
      }),
      { params: { id: 'post-uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('Updated Title');
    expect(body.content).toBe('## Updated');
    expect(mockUpdatePost).toHaveBeenCalledWith(
      'post-uuid-1',
      expect.objectContaining({ title: 'Updated Title', content: '## Updated' }),
    );
  });

  it('sets publishedAt timestamp when toggling published to true for the first time', async () => {
    const publishedPost = { ...post1, published: true, publishedAt: new Date() };
    mockGetPostById.mockResolvedValue({ ...post1, published: false, publishedAt: null });
    mockUpdatePost.mockResolvedValue(publishedPost);
    const { PUT } = await import('@/app/api/admin/blog/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/blog/post-uuid-1', {
        method: 'PUT',
        body: { published: true },
      }),
      { params: { id: 'post-uuid-1' } },
    );

    expect(response.status).toBe(200);
    expect(mockUpdatePost).toHaveBeenCalledWith(
      'post-uuid-1',
      expect.objectContaining({ published: true, publishedAt: expect.any(Date) }),
    );
  });
});

describe('DELETE /api/admin/blog/[id]', () => {
  it('removes the post and returns 200', async () => {
    mockDeletePost.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/admin/blog/[id]/route');

    const response = await DELETE(
      withSession('http://localhost/api/admin/blog/post-uuid-1', { method: 'DELETE' }),
      { params: { id: 'post-uuid-1' } },
    );

    expect(response.status).toBe(200);
    expect(mockDeletePost).toHaveBeenCalledWith('post-uuid-1');
  });
});

describe('GET /api/admin/blog/[id]', () => {
  it('returns a single post by ID including full content', async () => {
    mockGetPostById.mockResolvedValue({ ...post1, content: '# Full Markdown Content' });
    const { GET } = await import('@/app/api/admin/blog/[id]/route');

    const response = await GET(
      withSession('http://localhost/api/admin/blog/post-uuid-1'),
      { params: { id: 'post-uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('post-uuid-1');
    expect(body.content).toBe('# Full Markdown Content');
    expect(mockGetPostById).toHaveBeenCalledWith('post-uuid-1');
  });
});

describe('Auth checks — all endpoints return 401 without valid session', () => {
  it('GET /api/admin/blog returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/admin/blog/route');
    const response = await GET(makeRequest('http://localhost/api/admin/blog?tenantId=tenant-uuid-1'));
    expect(response.status).toBe(401);
  });

  it('POST /api/admin/blog returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/admin/blog/route');
    const response = await POST(
      makeRequest('http://localhost/api/admin/blog?tenantId=tenant-uuid-1', {
        method: 'POST',
        body: { title: 'T', slug: 's', content: 'c', author: 'a' },
      }),
    );
    expect(response.status).toBe(401);
  });

  it('GET /api/admin/blog/[id] returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/admin/blog/[id]/route');
    const response = await GET(
      makeRequest('http://localhost/api/admin/blog/post-uuid-1'),
      { params: { id: 'post-uuid-1' } },
    );
    expect(response.status).toBe(401);
  });

  it('PUT /api/admin/blog/[id] returns 401 without auth', async () => {
    const { PUT } = await import('@/app/api/admin/blog/[id]/route');
    const response = await PUT(
      makeRequest('http://localhost/api/admin/blog/post-uuid-1', {
        method: 'PUT',
        body: { title: 'T' },
      }),
      { params: { id: 'post-uuid-1' } },
    );
    expect(response.status).toBe(401);
  });

  it('DELETE /api/admin/blog/[id] returns 401 without auth', async () => {
    const { DELETE } = await import('@/app/api/admin/blog/[id]/route');
    const response = await DELETE(
      makeRequest('http://localhost/api/admin/blog/post-uuid-1', { method: 'DELETE' }),
      { params: { id: 'post-uuid-1' } },
    );
    expect(response.status).toBe(401);
  });
});
