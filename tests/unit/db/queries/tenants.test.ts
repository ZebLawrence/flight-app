// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for tenant query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('tenants queries', () => {
  // Dynamically imported inside beforeAll to avoid module-level throws
  // when DATABASE_URL is not set.
  let getTenantBySlug: (typeof import('@/lib/db/queries/tenants'))['getTenantBySlug'];
  let getTenantById: (typeof import('@/lib/db/queries/tenants'))['getTenantById'];
  let listTenants: (typeof import('@/lib/db/queries/tenants'))['listTenants'];
  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let updateTenant: (typeof import('@/lib/db/queries/tenants'))['updateTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];

  let db: (typeof import('@/lib/db'))['db'];
  let pages: (typeof import('@/lib/db/schema'))['pages'];
  let eq: (typeof import('drizzle-orm'))['eq'];

  // IDs of tenants created during tests — cleaned up in afterAll.
  const createdIds: string[] = [];

  beforeAll(async () => {
    const queries = await import('@/lib/db/queries/tenants');
    getTenantBySlug = queries.getTenantBySlug;
    getTenantById = queries.getTenantById;
    listTenants = queries.listTenants;
    createTenant = queries.createTenant;
    updateTenant = queries.updateTenant;
    deleteTenant = queries.deleteTenant;

    const dbMod = await import('@/lib/db');
    db = dbMod.db;

    const schemaMod = await import('@/lib/db/schema');
    pages = schemaMod.pages;

    const drizzleMod = await import('drizzle-orm');
    eq = drizzleMod.eq;
  });

  afterAll(async () => {
    // Remove any tenants that were not explicitly deleted by tests.
    if (createdIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const { tenants } = await import('@/lib/db/schema');
      await db.delete(tenants).where(inArray(tenants.id, createdIds));
    }
  });

  function uniqueSlug(prefix = 'test') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function seedTenant(overrides: Partial<{ name: string; slug: string; customDomain: string | null }> = {}) {
    const slug = overrides.slug ?? uniqueSlug();
    const tenant = await createTenant({
      name: overrides.name ?? 'Test Tenant',
      slug,
      customDomain: overrides.customDomain ?? null,
    });
    createdIds.push(tenant.id);
    return tenant;
  }

  // ─── getTenantBySlug ───────────────────────────────────────────────────────

  it('getTenantBySlug returns tenant for existing slug', async () => {
    const created = await seedTenant({ slug: uniqueSlug('slug-exists') });

    const result = await getTenantBySlug(created.slug);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.slug).toBe(created.slug);
  });

  it('getTenantBySlug returns null for unknown slug', async () => {
    const result = await getTenantBySlug('this-slug-does-not-exist-xyz');

    expect(result).toBeNull();
  });

  // ─── getTenantById ────────────────────────────────────────────────────────

  it('getTenantById returns tenant for valid UUID', async () => {
    const created = await seedTenant();

    const result = await getTenantById(created.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
  });

  it('getTenantById returns null for unknown UUID', async () => {
    const result = await getTenantById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeNull();
  });

  // ─── listTenants ──────────────────────────────────────────────────────────

  it('listTenants returns all tenants within default limit', async () => {
    await seedTenant();
    await seedTenant();

    const { data, total } = await listTenants();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(data.length);
  });

  it('listTenants with limit:2 returns at most 2 tenants', async () => {
    // Ensure at least 3 tenants exist.
    await seedTenant();
    await seedTenant();
    await seedTenant();

    const { data } = await listTenants({ limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('listTenants with offset skips the correct number of rows', async () => {
    // Seed enough tenants so we have a predictable ordered set.
    await seedTenant();
    await seedTenant();
    await seedTenant();

    const page1 = await listTenants({ limit: 100, offset: 0 });
    const page2 = await listTenants({ limit: 100, offset: 1 });

    // page2 should have one fewer row than page1
    expect(page2.data.length).toBe(page1.data.length - 1);
    // The first row of page2 should equal the second row of page1
    if (page1.data.length >= 2) {
      expect(page2.data[0].id).toBe(page1.data[1].id);
    }
  });

  it('listTenants returns correct total regardless of limit/offset', async () => {
    await seedTenant();

    const withLargeLimit = await listTenants({ limit: 1000, offset: 0 });
    const withSmallLimit = await listTenants({ limit: 1, offset: 0 });

    expect(withLargeLimit.total).toBe(withSmallLimit.total);
  });

  // ─── createTenant ─────────────────────────────────────────────────────────

  it('createTenant inserts row and returns it with generated id and timestamps', async () => {
    const before = new Date();

    const tenant = await createTenant({ name: 'New Co', slug: uniqueSlug('new-co') });
    createdIds.push(tenant.id);

    expect(tenant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(tenant.name).toBe('New Co');
    expect(tenant.createdAt).toBeInstanceOf(Date);
    expect(tenant.updatedAt).toBeInstanceOf(Date);
    expect(tenant.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('createTenant rejects duplicate slugs', async () => {
    const slug = uniqueSlug('dup');
    const first = await createTenant({ name: 'First', slug });
    createdIds.push(first.id);

    await expect(createTenant({ name: 'Second', slug })).rejects.toThrow();
  });

  // ─── updateTenant ─────────────────────────────────────────────────────────

  it('updateTenant modifies specified fields and leaves others unchanged', async () => {
    const original = await seedTenant({ name: 'Before Update' });

    const updated = await updateTenant(original.id, { name: 'After Update' });

    expect(updated.name).toBe('After Update');
    expect(updated.slug).toBe(original.slug);
    expect(updated.id).toBe(original.id);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  // ─── deleteTenant ─────────────────────────────────────────────────────────

  it('deleteTenant removes the tenant and cascades to associated pages', async () => {
    const { tenants: tenantsTable } = await import('@/lib/db/schema');

    const tenant = await createTenant({
      name: 'To Delete',
      slug: uniqueSlug('delete-me'),
    });

    // Create an associated page.
    const [page] = await db
      .insert(pages)
      .values({
        tenantId: tenant.id,
        slug: 'home',
        title: 'Home',
        content: {},
      })
      .returning();

    await deleteTenant(tenant.id);

    // Tenant should be gone.
    const tenantRow = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenant.id))
      .limit(1);
    expect(tenantRow).toHaveLength(0);

    // Page should have been cascaded away.
    const pageRow = await db
      .select()
      .from(pages)
      .where(eq(pages.id, page.id))
      .limit(1);
    expect(pageRow).toHaveLength(0);
  });
});
