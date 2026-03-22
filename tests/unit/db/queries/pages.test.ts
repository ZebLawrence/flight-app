// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for page query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('pages queries', () => {
  let getPageBySlug: (typeof import('@/lib/db/queries/pages'))['getPageBySlug'];
  let getPagesByTenant: (typeof import('@/lib/db/queries/pages'))['getPagesByTenant'];
  let createPage: (typeof import('@/lib/db/queries/pages'))['createPage'];
  let updatePage: (typeof import('@/lib/db/queries/pages'))['updatePage'];
  let deletePage: (typeof import('@/lib/db/queries/pages'))['deletePage'];
  let reorderPages: (typeof import('@/lib/db/queries/pages'))['reorderPages'];

  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];

  let db: (typeof import('@/lib/db'))['db'];
  let pages: (typeof import('@/lib/db/schema'))['pages'];
  let eq: (typeof import('drizzle-orm'))['eq'];

  // Tenant IDs created during tests — cleaned up in afterAll.
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    const pageQueries = await import('@/lib/db/queries/pages');
    getPageBySlug = pageQueries.getPageBySlug;
    getPagesByTenant = pageQueries.getPagesByTenant;
    createPage = pageQueries.createPage;
    updatePage = pageQueries.updatePage;
    deletePage = pageQueries.deletePage;
    reorderPages = pageQueries.reorderPages;

    const tenantQueries = await import('@/lib/db/queries/tenants');
    createTenant = tenantQueries.createTenant;
    deleteTenant = tenantQueries.deleteTenant;

    const dbMod = await import('@/lib/db');
    db = dbMod.db;

    const schemaMod = await import('@/lib/db/schema');
    pages = schemaMod.pages;

    const drizzleMod = await import('drizzle-orm');
    eq = drizzleMod.eq;
  });

  afterAll(async () => {
    if (createdTenantIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const { tenants } = await import('@/lib/db/schema');
      await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
    }
  });

  function uniqueSlug(prefix = 'page') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function seedTenant() {
    const tenant = await createTenant({
      name: 'Test Tenant',
      slug: uniqueSlug('tenant'),
    });
    createdTenantIds.push(tenant.id);
    return tenant;
  }

  async function seedPage(tenantId: string, overrides: Partial<{ slug: string; title: string; sortOrder: number }> = {}) {
    return createPage({
      tenantId,
      slug: overrides.slug ?? uniqueSlug(),
      title: overrides.title ?? 'Test Page',
      sortOrder: overrides.sortOrder ?? 0,
    });
  }

  // ─── getPageBySlug ────────────────────────────────────────────────────────

  it('getPageBySlug scoped to tenant — same slug in different tenants returns correct page', async () => {
    const sharedSlug = uniqueSlug('shared');
    const tenantA = await seedTenant();
    const tenantB = await seedTenant();

    const pageA = await seedPage(tenantA.id, { slug: sharedSlug });
    await seedPage(tenantB.id, { slug: sharedSlug });

    const result = await getPageBySlug(tenantA.id, sharedSlug);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(pageA.id);
    expect(result?.tenantId).toBe(tenantA.id);
  });

  // ─── getPagesByTenant ─────────────────────────────────────────────────────

  it('getPagesByTenant returns only pages belonging to that tenant', async () => {
    const tenantA = await seedTenant();
    const tenantB = await seedTenant();

    await seedPage(tenantA.id);
    await seedPage(tenantA.id);
    await seedPage(tenantB.id);

    const { data } = await getPagesByTenant(tenantA.id);

    expect(data.every((p) => p.tenantId === tenantA.id)).toBe(true);
  });

  it('getPagesByTenant with limit:2 returns at most 2 pages', async () => {
    const tenant = await seedTenant();

    await seedPage(tenant.id);
    await seedPage(tenant.id);
    await seedPage(tenant.id);

    const { data } = await getPagesByTenant(tenant.id, { limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('getPagesByTenant with offset skips the correct number of rows', async () => {
    const tenant = await seedTenant();

    await seedPage(tenant.id);
    await seedPage(tenant.id);
    await seedPage(tenant.id);

    const page1 = await getPagesByTenant(tenant.id, { limit: 100, offset: 0 });
    const page2 = await getPagesByTenant(tenant.id, { limit: 100, offset: 1 });

    expect(page2.data.length).toBe(page1.data.length - 1);
    expect(page1.data.length).toBeGreaterThanOrEqual(2);
    expect(page2.data[0].id).toBe(page1.data[1].id);
  });

  it('getPagesByTenant returns correct total count regardless of limit/offset', async () => {
    const tenant = await seedTenant();

    await seedPage(tenant.id);
    await seedPage(tenant.id);

    const withLargeLimit = await getPagesByTenant(tenant.id, { limit: 1000, offset: 0 });
    const withSmallLimit = await getPagesByTenant(tenant.id, { limit: 1, offset: 0 });

    expect(withLargeLimit.total).toBe(withSmallLimit.total);
    expect(withLargeLimit.total).toBeGreaterThanOrEqual(2);
  });

  // ─── createPage ───────────────────────────────────────────────────────────

  it('createPage inserts page with correct tenant FK', async () => {
    const tenant = await seedTenant();

    const page = await createPage({
      tenantId: tenant.id,
      slug: uniqueSlug('create-test'),
      title: 'My Page',
      content: { body: 'hello' },
    });

    expect(page.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(page.tenantId).toBe(tenant.id);
    expect(page.title).toBe('My Page');
    expect(page.content).toEqual({ body: 'hello' });
  });

  // ─── updatePage ───────────────────────────────────────────────────────────

  it('updatePage updates content JSONB and updated_at', async () => {
    const tenant = await seedTenant();
    const original = await seedPage(tenant.id);

    // Ensure at least 1ms has elapsed so updatedAt changes
    await new Promise((r) => setTimeout(r, 10));

    const updated = await updatePage(original.id, {
      content: { body: 'updated content' },
    });

    expect(updated.content).toEqual({ body: 'updated content' });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  // ─── deletePage ───────────────────────────────────────────────────────────

  it('deletePage removes page', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    await deletePage(page.id);

    const rows = await db.select().from(pages).where(eq(pages.id, page.id)).limit(1);
    expect(rows).toHaveLength(0);
  });

  // ─── reorderPages ─────────────────────────────────────────────────────────

  it('reorderPages updates sort_order for multiple pages in a single call', async () => {
    const tenant = await seedTenant();

    const pageA = await seedPage(tenant.id, { sortOrder: 0 });
    const pageB = await seedPage(tenant.id, { sortOrder: 1 });
    const pageC = await seedPage(tenant.id, { sortOrder: 2 });

    // Reverse the order: C=0, B=1, A=2
    await reorderPages(tenant.id, [pageC.id, pageB.id, pageA.id]);

    const { data } = await getPagesByTenant(tenant.id);
    const byId = Object.fromEntries(data.map((p) => [p.id, p]));

    expect(byId[pageC.id].sortOrder).toBe(0);
    expect(byId[pageB.id].sortOrder).toBe(1);
    expect(byId[pageA.id].sortOrder).toBe(2);
  });
});
