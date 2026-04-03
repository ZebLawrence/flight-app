// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const FAKE_TOKEN = 'valid.session.token';

const mockValidateSession = vi.hoisted(() => vi.fn());
const mockGetPageById = vi.hoisted(() => vi.fn());
const mockUpdatePage = vi.hoisted(() => vi.fn());
const mockCreateVersion = vi.hoisted(() => vi.fn());
const mockGetVersionsByPage = vi.hoisted(() => vi.fn());
const mockGetVersion = vi.hoisted(() => vi.fn());
const mockPruneVersions = vi.hoisted(() => vi.fn());
const mockRevalidateTag = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('next/cache', () => ({
  revalidateTag: mockRevalidateTag,
}));

vi.mock('@/lib/db/queries/pages', () => ({
  getPageById: mockGetPageById,
  updatePage: mockUpdatePage,
}));

vi.mock('@/lib/db/queries/page-versions', () => ({
  createVersion: mockCreateVersion,
  getVersionsByPage: mockGetVersionsByPage,
  getVersion: mockGetVersion,
  pruneVersions: mockPruneVersions,
}));

const existingPage = {
  id: 'page-uuid-1',
  tenantId: 'tenant-uuid-1',
  slug: 'home',
  title: 'Home',
  content: { blocks: [{ type: 'text', value: 'old content' }] },
  published: true,
  sortOrder: 0,
  meta: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const version1 = {
  id: 'version-uuid-1',
  pageId: 'page-uuid-1',
  title: 'Home',
  content: { blocks: [{ type: 'text', value: 'old content' }] },
  createdAt: new Date(),
  createdBy: null,
};

const version2 = {
  id: 'version-uuid-2',
  pageId: 'page-uuid-1',
  title: 'Home v2',
  content: { blocks: [{ type: 'text', value: 'even older content' }] },
  createdAt: new Date(Date.now() - 60_000),
  createdBy: null,
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
  mockPruneVersions.mockResolvedValue(undefined);
  mockCreateVersion.mockResolvedValue(version1);
});

describe('PUT /api/admin/pages/[id] — versioning', () => {
  it('creates a version of the old content before overwriting', async () => {
    const updatedPage = { ...existingPage, title: 'New Title', content: { blocks: [] } };
    mockGetPageById.mockResolvedValue(existingPage);
    mockUpdatePage.mockResolvedValue(updatedPage);
    const { PUT } = await import('@/app/api/admin/pages/[id]/route');

    const response = await PUT(
      withSession('http://localhost/api/admin/pages/page-uuid-1', {
        method: 'PUT',
        body: { title: 'New Title', content: { blocks: [] } },
      }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(200);
    // createVersion was called with the OLD page content/title before updating
    expect(mockCreateVersion).toHaveBeenCalledWith(
      'page-uuid-1',
      existingPage.content,
      existingPage.title,
    );
    // updatePage was called with new content
    expect(mockUpdatePage).toHaveBeenCalledWith(
      'page-uuid-1',
      expect.objectContaining({ title: 'New Title', content: { blocks: [] } }),
    );
    // pruneVersions called to keep last 10
    expect(mockPruneVersions).toHaveBeenCalledWith('page-uuid-1', 10);
  });

  it('returns 401 without auth cookie', async () => {
    const { PUT } = await import('@/app/api/admin/pages/[id]/route');

    const response = await PUT(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1', {
        method: 'PUT',
        body: { title: 'Test' },
      }),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(401);
    expect(mockGetPageById).not.toHaveBeenCalled();
    expect(mockCreateVersion).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/pages/[id]/versions', () => {
  it('returns list of versions for the page newest-first', async () => {
    mockGetVersionsByPage.mockResolvedValue({ data: [version1, version2], total: 2 });
    const { GET } = await import('@/app/api/admin/pages/[id]/versions/route');

    const response = await GET(
      withSession('http://localhost/api/admin/pages/page-uuid-1/versions'),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total', 2);
    expect(body.data[0].id).toBe('version-uuid-1');
    expect(mockGetVersionsByPage).toHaveBeenCalledWith('page-uuid-1', expect.any(Object));
  });

  it('returns 401 without auth cookie', async () => {
    const { GET } = await import('@/app/api/admin/pages/[id]/versions/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1/versions'),
      { params: { id: 'page-uuid-1' } },
    );

    expect(response.status).toBe(401);
    expect(mockGetVersionsByPage).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/pages/[id]/versions/[versionId]', () => {
  it('returns the correct version content', async () => {
    mockGetVersion.mockResolvedValue(version1);
    const { GET } = await import('@/app/api/admin/pages/[id]/versions/[versionId]/route');

    const response = await GET(
      withSession('http://localhost/api/admin/pages/page-uuid-1/versions/version-uuid-1'),
      { params: { id: 'page-uuid-1', versionId: 'version-uuid-1' } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('version-uuid-1');
    expect(body.content).toEqual(version1.content);
    expect(mockGetVersion).toHaveBeenCalledWith('version-uuid-1');
  });

  it('returns 401 without auth cookie', async () => {
    const { GET } = await import('@/app/api/admin/pages/[id]/versions/[versionId]/route');

    const response = await GET(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1/versions/version-uuid-1'),
      { params: { id: 'page-uuid-1', versionId: 'version-uuid-1' } },
    );

    expect(response.status).toBe(401);
    expect(mockGetVersion).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/pages/[id]/versions/[versionId]/restore', () => {
  it('saves current state as a version then restores selected version content', async () => {
    const restoredPage = { ...existingPage, content: version2.content, title: version2.title };
    mockGetVersion.mockResolvedValue(version2);
    mockGetPageById.mockResolvedValue(existingPage);
    mockUpdatePage.mockResolvedValue(restoredPage);
    const { POST } = await import('@/app/api/admin/pages/[id]/versions/[versionId]/route');

    const response = await POST(
      withSession('http://localhost/api/admin/pages/page-uuid-1/versions/version-uuid-2', {
        method: 'POST',
      }),
      { params: { id: 'page-uuid-1', versionId: 'version-uuid-2' } },
    );

    expect(response.status).toBe(200);
    // createVersion saves pre-restore state
    expect(mockCreateVersion).toHaveBeenCalledWith(
      'page-uuid-1',
      existingPage.content,
      existingPage.title,
    );
    // updatePage applies the restored version
    expect(mockUpdatePage).toHaveBeenCalledWith(
      'page-uuid-1',
      expect.objectContaining({ content: version2.content, title: version2.title }),
    );
    expect(mockPruneVersions).toHaveBeenCalledWith('page-uuid-1', 10);
  });

  it('returns 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/admin/pages/[id]/versions/[versionId]/route');

    const response = await POST(
      makeRequest('http://localhost/api/admin/pages/page-uuid-1/versions/version-uuid-2', {
        method: 'POST',
      }),
      { params: { id: 'page-uuid-1', versionId: 'version-uuid-2' } },
    );

    expect(response.status).toBe(401);
    expect(mockGetVersion).not.toHaveBeenCalled();
    expect(mockCreateVersion).not.toHaveBeenCalled();
  });
});
