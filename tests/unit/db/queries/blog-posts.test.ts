// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for blog post query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('blog-posts queries', () => {
  // Dynamically imported inside beforeAll to avoid module-level throws
  // when DATABASE_URL is not set.
  let getPostBySlug: (typeof import('@/lib/db/queries/blog-posts'))['getPostBySlug'];
  let getPostsByTenant: (typeof import('@/lib/db/queries/blog-posts'))['getPostsByTenant'];
  let createPost: (typeof import('@/lib/db/queries/blog-posts'))['createPost'];
  let updatePost: (typeof import('@/lib/db/queries/blog-posts'))['updatePost'];
  let deletePost: (typeof import('@/lib/db/queries/blog-posts'))['deletePost'];
  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];

  let db: (typeof import('@/lib/db'))['db'];
  let blogPosts: (typeof import('@/lib/db/schema'))['blogPosts'];
  let eq: (typeof import('drizzle-orm'))['eq'];

  // IDs of posts created during tests — cleaned up in afterAll.
  const createdPostIds: string[] = [];
  // IDs of tenants created during tests — cleaned up in afterAll.
  const createdTenantIds: string[] = [];

  let tenantId: string;

  beforeAll(async () => {
    const queries = await import('@/lib/db/queries/blog-posts');
    getPostBySlug = queries.getPostBySlug;
    getPostsByTenant = queries.getPostsByTenant;
    createPost = queries.createPost;
    updatePost = queries.updatePost;
    deletePost = queries.deletePost;

    const tenantQueries = await import('@/lib/db/queries/tenants');
    createTenant = tenantQueries.createTenant;
    deleteTenant = tenantQueries.deleteTenant;

    const dbMod = await import('@/lib/db');
    db = dbMod.db;

    const schemaMod = await import('@/lib/db/schema');
    blogPosts = schemaMod.blogPosts;

    const drizzleMod = await import('drizzle-orm');
    eq = drizzleMod.eq;

    // Create a shared tenant for all tests.
    const tenant = await createTenant({
      name: 'Blog Test Tenant',
      slug: `blog-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    createdTenantIds.push(tenant.id);
    tenantId = tenant.id;
  });

  afterAll(async () => {
    // Remove any posts that were not explicitly deleted by tests.
    if (createdPostIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      await db.delete(blogPosts).where(inArray(blogPosts.id, createdPostIds));
    }
    // Remove tenants created during tests.
    for (const id of createdTenantIds) {
      await deleteTenant(id);
    }
  });

  function uniqueSlug(prefix = 'post') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function seedPost(
    overrides: Partial<Parameters<typeof createPost>[0]> = {},
  ) {
    const post = await createPost({
      tenantId,
      slug: uniqueSlug(),
      title: 'Test Post',
      content: 'Test content',
      author: 'Test Author',
      tags: [],
      ...overrides,
    });
    createdPostIds.push(post.id);
    return post;
  }

  // ─── getPostBySlug ────────────────────────────────────────────────────────

  it('getPostBySlug returns post for existing tenant+slug', async () => {
    const created = await seedPost({ slug: uniqueSlug('slug-exists') });

    const result = await getPostBySlug(tenantId, created.slug);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.slug).toBe(created.slug);
    expect(result?.tenantId).toBe(tenantId);
  });

  it('getPostBySlug returns null for unknown slug', async () => {
    const result = await getPostBySlug(tenantId, 'this-slug-does-not-exist-xyz');

    expect(result).toBeNull();
  });

  it('getPostBySlug is scoped to tenant', async () => {
    const otherTenant = await createTenant({
      name: 'Other Tenant',
      slug: uniqueSlug('other-tenant'),
    });
    createdTenantIds.push(otherTenant.id);

    const slug = uniqueSlug('scoped');
    const post = await createPost({
      tenantId: otherTenant.id,
      slug,
      title: 'Other Tenant Post',
      content: 'Content',
      author: 'Author',
    });
    createdPostIds.push(post.id);

    // Should not be found under the main tenant.
    const result = await getPostBySlug(tenantId, slug);
    expect(result).toBeNull();
  });

  // ─── getPostsByTenant ─────────────────────────────────────────────────────

  it('getPostsByTenant returns posts for the tenant', async () => {
    await seedPost();
    await seedPost();

    const { data, total } = await getPostsByTenant(tenantId);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(data.length);
    // All returned posts should belong to the tenant.
    for (const post of data) {
      expect(post.tenantId).toBe(tenantId);
    }
  });

  it('getPostsByTenant returns only published posts when published: true', async () => {
    await seedPost({ published: false });
    await seedPost({
      published: true,
      publishedAt: new Date('2024-01-01T00:00:00Z'),
    });

    const { data } = await getPostsByTenant(tenantId, { published: true });

    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const post of data) {
      expect(post.published).toBe(true);
    }
  });

  it('published posts are ordered by published_at desc', async () => {
    const now = Date.now();
    await seedPost({
      published: true,
      publishedAt: new Date(now - 2000),
    });
    await seedPost({
      published: true,
      publishedAt: new Date(now - 1000),
    });
    await seedPost({
      published: true,
      publishedAt: new Date(now),
    });

    const { data } = await getPostsByTenant(tenantId, { published: true });

    // Verify descending order of publishedAt.
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].publishedAt?.getTime() ?? 0;
      const curr = data[i].publishedAt?.getTime() ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('getPostsByTenant with limit:2 returns at most 2 posts', async () => {
    // Ensure at least 3 posts exist.
    await seedPost();
    await seedPost();
    await seedPost();

    const { data } = await getPostsByTenant(tenantId, { limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('getPostsByTenant with offset skips the correct number of rows', async () => {
    await seedPost();
    await seedPost();
    await seedPost();

    const page1 = await getPostsByTenant(tenantId, { limit: 100, offset: 0 });
    const page2 = await getPostsByTenant(tenantId, { limit: 100, offset: 1 });

    expect(page2.data.length).toBe(page1.data.length - 1);
    if (page1.data.length >= 2) {
      expect(page2.data[0].id).toBe(page1.data[1].id);
    }
  });

  it('getPostsByTenant returns correct total regardless of limit/offset', async () => {
    await seedPost();

    const withLargeLimit = await getPostsByTenant(tenantId, { limit: 1000, offset: 0 });
    const withSmallLimit = await getPostsByTenant(tenantId, { limit: 1, offset: 0 });

    expect(withLargeLimit.total).toBe(withSmallLimit.total);
  });

  // ─── createPost ───────────────────────────────────────────────────────────

  it('createPost inserts row and returns it with generated id and timestamps', async () => {
    const before = new Date();

    const post = await createPost({
      tenantId,
      slug: uniqueSlug('create-test'),
      title: 'My Post',
      content: 'Hello world',
      author: 'Jane Doe',
    });
    createdPostIds.push(post.id);

    expect(post.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(post.title).toBe('My Post');
    expect(post.tenantId).toBe(tenantId);
    expect(post.createdAt).toBeInstanceOf(Date);
    expect(post.updatedAt).toBeInstanceOf(Date);
    expect(post.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('createPost rejects duplicate tenant+slug', async () => {
    const slug = uniqueSlug('dup');
    const first = await createPost({
      tenantId,
      slug,
      title: 'First',
      content: 'Content',
      author: 'Author',
    });
    createdPostIds.push(first.id);

    await expect(
      createPost({ tenantId, slug, title: 'Second', content: 'Content', author: 'Author' }),
    ).rejects.toThrow();
  });

  it('tags array round-trips correctly', async () => {
    const tags = ['typescript', 'drizzle', 'postgres'];

    const post = await createPost({
      tenantId,
      slug: uniqueSlug('tags-test'),
      title: 'Tags Post',
      content: 'Content',
      author: 'Author',
      tags,
    });
    createdPostIds.push(post.id);

    expect(post.tags).toEqual(tags);

    // Re-fetch from DB and verify.
    const fetched = await getPostBySlug(tenantId, post.slug);
    expect(fetched?.tags).toEqual(tags);
  });

  // ─── updatePost ───────────────────────────────────────────────────────────

  it('updatePost modifies specified fields and leaves others unchanged', async () => {
    const original = await seedPost({ title: 'Before Update' });

    const updated = await updatePost(original.id, { title: 'After Update' });

    expect(updated.title).toBe('After Update');
    expect(updated.slug).toBe(original.slug);
    expect(updated.id).toBe(original.id);
    expect(updated.tenantId).toBe(tenantId);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  it('updatePost throws for unknown id', async () => {
    await expect(
      updatePost('00000000-0000-0000-0000-000000000000', { title: 'Ghost' }),
    ).rejects.toThrow('not found');
  });

  // ─── deletePost ───────────────────────────────────────────────────────────

  it('deletePost removes the post', async () => {
    const post = await createPost({
      tenantId,
      slug: uniqueSlug('delete-me'),
      title: 'To Delete',
      content: 'Content',
      author: 'Author',
    });

    await deletePost(post.id);

    const row = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, post.id))
      .limit(1);
    expect(row).toHaveLength(0);
  });
});
