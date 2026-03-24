// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for page-versions query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('page-versions queries', () => {
  let createVersion: (typeof import('@/lib/db/queries/page-versions'))['createVersion'];
  let getVersionsByPage: (typeof import('@/lib/db/queries/page-versions'))['getVersionsByPage'];
  let getVersion: (typeof import('@/lib/db/queries/page-versions'))['getVersion'];
  let pruneVersions: (typeof import('@/lib/db/queries/page-versions'))['pruneVersions'];

  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];
  let createPage: (typeof import('@/lib/db/queries/pages'))['createPage'];

  // Tenant IDs created during tests — cleaned up in afterAll.
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    const versionQueries = await import('@/lib/db/queries/page-versions');
    createVersion = versionQueries.createVersion;
    getVersionsByPage = versionQueries.getVersionsByPage;
    getVersion = versionQueries.getVersion;
    pruneVersions = versionQueries.pruneVersions;

    const tenantQueries = await import('@/lib/db/queries/tenants');
    createTenant = tenantQueries.createTenant;
    deleteTenant = tenantQueries.deleteTenant;

    const pageQueries = await import('@/lib/db/queries/pages');
    createPage = pageQueries.createPage;
  });

  afterAll(async () => {
    if (createdTenantIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const { tenants } = await import('@/lib/db/schema');
      const { db } = await import('@/lib/db');
      await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
    }
  });

  function uniqueSlug(prefix = 'pv') {
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

  async function seedPage(tenantId: string) {
    return createPage({
      tenantId,
      slug: uniqueSlug(),
      title: 'Test Page',
    });
  }

  // ─── createVersion ────────────────────────────────────────────────────────

  it('createVersion inserts a version row with correct page_id FK', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    const version = await createVersion(page.id, { body: 'hello' }, 'V1');

    expect(version.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(version.pageId).toBe(page.id);
    expect(version.title).toBe('V1');
    expect(version.content).toEqual({ body: 'hello' });
  });

  // ─── getVersionsByPage ────────────────────────────────────────────────────

  it('getVersionsByPage returns versions ordered newest-first', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    await createVersion(page.id, { v: 1 }, 'First');
    await new Promise((r) => setTimeout(r, 50));
    await createVersion(page.id, { v: 2 }, 'Second');
    await new Promise((r) => setTimeout(r, 50));
    await createVersion(page.id, { v: 3 }, 'Third');

    const { data } = await getVersionsByPage(page.id);

    expect(data.length).toBeGreaterThanOrEqual(3);
    // Newest first: each createdAt should be >= the next one
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].createdAt.getTime()).toBeGreaterThanOrEqual(data[i + 1].createdAt.getTime());
    }
  });

  it('getVersionsByPage with limit paginates correctly', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    await createVersion(page.id, { v: 1 }, 'V1');
    await createVersion(page.id, { v: 2 }, 'V2');
    await createVersion(page.id, { v: 3 }, 'V3');

    const { data } = await getVersionsByPage(page.id, { limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  // ─── pruneVersions ────────────────────────────────────────────────────────

  it('pruneVersions keeps only the N most recent versions', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    await createVersion(page.id, { v: 1 }, 'V1');
    await new Promise((r) => setTimeout(r, 50));
    await createVersion(page.id, { v: 2 }, 'V2');
    await new Promise((r) => setTimeout(r, 50));
    const v3 = await createVersion(page.id, { v: 3 }, 'V3');

    await pruneVersions(page.id, 1);

    const { data, total } = await getVersionsByPage(page.id);

    expect(total).toBe(1);
    expect(data[0].id).toBe(v3.id);
  });

  // ─── getVersion ───────────────────────────────────────────────────────────

  it('getVersion returns the correct version by ID; returns null for unknown ID', async () => {
    const tenant = await seedTenant();
    const page = await seedPage(tenant.id);

    const created = await createVersion(page.id, { body: 'test' }, 'My Version');

    const found = await getVersion(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.title).toBe('My Version');

    const missing = await getVersion('00000000-0000-0000-0000-000000000000');
    expect(missing).toBeNull();
  });
});
