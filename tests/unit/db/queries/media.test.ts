// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for media query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('media queries', () => {
  // Dynamically imported inside beforeAll to avoid module-level throws
  // when DATABASE_URL is not set.
  let getMediaByTenant: (typeof import('@/lib/db/queries/media'))['getMediaByTenant'];
  let createMedia: (typeof import('@/lib/db/queries/media'))['createMedia'];
  let deleteMedia: (typeof import('@/lib/db/queries/media'))['deleteMedia'];
  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];

  let db: (typeof import('@/lib/db'))['db'];
  let media: (typeof import('@/lib/db/schema'))['media'];
  let eq: (typeof import('drizzle-orm'))['eq'];

  // IDs of media records created during tests — cleaned up in afterAll.
  const createdMediaIds: string[] = [];
  // IDs of tenants created during tests — cleaned up in afterAll.
  const createdTenantIds: string[] = [];

  let tenantId: string;

  beforeAll(async () => {
    const queries = await import('@/lib/db/queries/media');
    getMediaByTenant = queries.getMediaByTenant;
    createMedia = queries.createMedia;
    deleteMedia = queries.deleteMedia;

    const tenantQueries = await import('@/lib/db/queries/tenants');
    createTenant = tenantQueries.createTenant;
    deleteTenant = tenantQueries.deleteTenant;

    const dbMod = await import('@/lib/db');
    db = dbMod.db;

    const schemaMod = await import('@/lib/db/schema');
    media = schemaMod.media;

    const drizzleMod = await import('drizzle-orm');
    eq = drizzleMod.eq;

    // Create a shared tenant for all tests.
    const tenant = await createTenant({
      name: 'Media Test Tenant',
      slug: `media-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    createdTenantIds.push(tenant.id);
    tenantId = tenant.id;
  });

  afterAll(async () => {
    // Remove any media records that were not explicitly deleted by tests.
    if (createdMediaIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      await db.delete(media).where(inArray(media.id, createdMediaIds));
    }
    // Remove tenants created during tests.
    for (const id of createdTenantIds) {
      await deleteTenant(id);
    }
  });

  function uniqueFilename(prefix = 'file') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  }

  async function seedMedia(
    overrides: Partial<Parameters<typeof createMedia>[0]> = {},
  ) {
    const row = await createMedia({
      tenantId,
      filename: uniqueFilename(),
      s3Key: `uploads/${uniqueFilename()}`,
      url: `https://cdn.example.com/${uniqueFilename()}`,
      mimeType: 'image/jpeg',
      sizeBytes: 12345,
      ...overrides,
    });
    createdMediaIds.push(row.id);
    return row;
  }

  // ─── getMediaByTenant ─────────────────────────────────────────────────────

  it('getMediaByTenant returns media for the tenant', async () => {
    await seedMedia();
    await seedMedia();

    const { data, total } = await getMediaByTenant(tenantId);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(data.length);
    // All returned records should belong to the tenant.
    for (const row of data) {
      expect(row.tenantId).toBe(tenantId);
    }
  });

  it('getMediaByTenant is scoped to tenant', async () => {
    const otherTenant = await createTenant({
      name: 'Other Media Tenant',
      slug: `other-media-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    createdTenantIds.push(otherTenant.id);

    // Seed a record under the other tenant.
    const otherRow = await createMedia({
      tenantId: otherTenant.id,
      filename: uniqueFilename('other'),
      s3Key: `uploads/${uniqueFilename('other')}`,
      url: `https://cdn.example.com/${uniqueFilename('other')}`,
      mimeType: 'image/png',
      sizeBytes: 9999,
    });
    createdMediaIds.push(otherRow.id);

    const { data } = await getMediaByTenant(tenantId);

    // None of the returned records should belong to the other tenant.
    for (const row of data) {
      expect(row.tenantId).toBe(tenantId);
    }
    expect(data.find((r) => r.id === otherRow.id)).toBeUndefined();
  });

  it('getMediaByTenant with limit:2 returns at most 2 items', async () => {
    // Ensure at least 3 records exist.
    await seedMedia();
    await seedMedia();
    await seedMedia();

    const { data } = await getMediaByTenant(tenantId, { limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('getMediaByTenant with offset skips the correct number of rows', async () => {
    await seedMedia();
    await seedMedia();
    await seedMedia();

    const page1 = await getMediaByTenant(tenantId, { limit: 100, offset: 0 });
    const page2 = await getMediaByTenant(tenantId, { limit: 100, offset: 1 });

    expect(page2.data.length).toBe(page1.data.length - 1);
    if (page1.data.length >= 2) {
      expect(page2.data[0].id).toBe(page1.data[1].id);
    }
  });

  it('getMediaByTenant returns correct total regardless of limit/offset', async () => {
    await seedMedia();

    const withLargeLimit = await getMediaByTenant(tenantId, { limit: 1000, offset: 0 });
    const withSmallLimit = await getMediaByTenant(tenantId, { limit: 1, offset: 0 });

    expect(withLargeLimit.total).toBe(withSmallLimit.total);
  });

  // ─── createMedia ──────────────────────────────────────────────────────────

  it('createMedia inserts row and returns it with generated id and timestamp', async () => {
    const before = new Date();

    const row = await createMedia({
      tenantId,
      filename: uniqueFilename('create-test'),
      s3Key: 'uploads/create-test.jpg',
      url: 'https://cdn.example.com/create-test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 54321,
    });
    createdMediaIds.push(row.id);

    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(row.tenantId).toBe(tenantId);
    expect(row.mimeType).toBe('image/jpeg');
    expect(row.sizeBytes).toBe(54321);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  // ─── deleteMedia ──────────────────────────────────────────────────────────

  it('deleteMedia removes the record', async () => {
    const row = await createMedia({
      tenantId,
      filename: uniqueFilename('delete-me'),
      s3Key: 'uploads/delete-me.jpg',
      url: 'https://cdn.example.com/delete-me.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1,
    });

    await deleteMedia(row.id);

    const remaining = await db
      .select()
      .from(media)
      .where(eq(media.id, row.id))
      .limit(1);
    expect(remaining).toHaveLength(0);
  });
});
