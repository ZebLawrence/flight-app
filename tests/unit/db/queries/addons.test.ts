// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for addon query functions.
 * These tests run against a real PostgreSQL database.
 * Set DATABASE_URL to run them (e.g. the value in .env.example).
 */

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)('addons queries', () => {
  // Dynamically imported inside beforeAll to avoid module-level throws
  // when DATABASE_URL is not set.
  let getAddonByKey: (typeof import('@/lib/db/queries/addons'))['getAddonByKey'];
  let listAddons: (typeof import('@/lib/db/queries/addons'))['listAddons'];
  let getTenantAddons: (typeof import('@/lib/db/queries/addons'))['getTenantAddons'];
  let toggleAddon: (typeof import('@/lib/db/queries/addons'))['toggleAddon'];
  let updateAddonConfig: (typeof import('@/lib/db/queries/addons'))['updateAddonConfig'];
  let createTenant: (typeof import('@/lib/db/queries/tenants'))['createTenant'];
  let deleteTenant: (typeof import('@/lib/db/queries/tenants'))['deleteTenant'];

  let db: (typeof import('@/lib/db'))['db'];
  let addons: (typeof import('@/lib/db/schema'))['addons'];
  let tenantAddonConfigs: (typeof import('@/lib/db/schema'))['tenantAddonConfigs'];
  let eq: (typeof import('drizzle-orm'))['eq'];
  let inArray: (typeof import('drizzle-orm'))['inArray'];

  // Tenant created for all tests — cleaned up in afterAll.
  const createdTenantIds: string[] = [];
  // Addon keys created during tests — cleaned up in afterAll.
  const createdAddonKeys: string[] = [];

  let tenantId: string;
  let addonKey: string;

  beforeAll(async () => {
    const addonQueries = await import('@/lib/db/queries/addons');
    getAddonByKey = addonQueries.getAddonByKey;
    listAddons = addonQueries.listAddons;
    getTenantAddons = addonQueries.getTenantAddons;
    toggleAddon = addonQueries.toggleAddon;
    updateAddonConfig = addonQueries.updateAddonConfig;

    const tenantQueries = await import('@/lib/db/queries/tenants');
    createTenant = tenantQueries.createTenant;
    deleteTenant = tenantQueries.deleteTenant;

    const dbMod = await import('@/lib/db');
    db = dbMod.db;

    const schemaMod = await import('@/lib/db/schema');
    addons = schemaMod.addons;
    tenantAddonConfigs = schemaMod.tenantAddonConfigs;

    const drizzleMod = await import('drizzle-orm');
    eq = drizzleMod.eq;
    inArray = drizzleMod.inArray;

    // Create a shared tenant for all tests.
    const tenant = await createTenant({
      name: 'Addon Test Tenant',
      slug: `addon-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    createdTenantIds.push(tenant.id);
    tenantId = tenant.id;

    // Create a shared addon for all tests.
    addonKey = `test-addon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await db
      .insert(addons)
      .values({ key: addonKey, name: 'Test Addon', configSchema: {} });
    createdAddonKeys.push(addonKey);
  });

  afterAll(async () => {
    // Delete tenant_addon_configs for created addons (may not cascade from addon delete).
    if (createdAddonKeys.length > 0) {
      await db
        .delete(tenantAddonConfigs)
        .where(inArray(tenantAddonConfigs.addonKey, createdAddonKeys));
      await db
        .delete(addons)
        .where(inArray(addons.key, createdAddonKeys));
    }
    // Delete tenants (cascades tenant_addon_configs).
    for (const id of createdTenantIds) {
      await deleteTenant(id);
    }
  });

  function uniqueAddonKey(prefix = 'addon') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function seedAddon(key: string, name = 'Seeded Addon') {
    await db.insert(addons).values({ key, name, configSchema: {} });
    createdAddonKeys.push(key);
    return key;
  }

  // ─── getAddonByKey ────────────────────────────────────────────────────────

  it('getAddonByKey returns addon for existing key', async () => {
    const result = await getAddonByKey(addonKey);

    expect(result).not.toBeNull();
    expect(result?.key).toBe(addonKey);
    expect(result?.name).toBe('Test Addon');
  });

  it('getAddonByKey returns null for unknown key', async () => {
    const result = await getAddonByKey('this-addon-does-not-exist-xyz');

    expect(result).toBeNull();
  });

  // ─── listAddons ───────────────────────────────────────────────────────────

  it('listAddons returns an array including the seeded addon', async () => {
    const result = await listAddons();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const found = result.find((a) => a.key === addonKey);
    expect(found).toBeDefined();
  });

  // ─── toggleAddon ──────────────────────────────────────────────────────────

  it('toggleAddon creates row when first enabled (upsert behavior)', async () => {
    const key = await seedAddon(uniqueAddonKey('toggle-create'));

    const row = await toggleAddon(tenantId, key, true);

    expect(row.tenantId).toBe(tenantId);
    expect(row.addonKey).toBe(key);
    expect(row.enabled).toBe(true);
  });

  it('toggleAddon updates enabled flag on subsequent calls', async () => {
    const key = await seedAddon(uniqueAddonKey('toggle-update'));

    // First call: enable
    const first = await toggleAddon(tenantId, key, true);
    expect(first.enabled).toBe(true);

    // Second call: disable
    const second = await toggleAddon(tenantId, key, false);
    expect(second.tenantId).toBe(tenantId);
    expect(second.addonKey).toBe(key);
    expect(second.enabled).toBe(false);
  });

  // ─── getTenantAddons ──────────────────────────────────────────────────────

  it('getTenantAddons returns only add-ons for that specific tenant', async () => {
    const key = await seedAddon(uniqueAddonKey('scoped'));

    // Create a second tenant.
    const otherTenant = await createTenant({
      name: 'Other Addon Tenant',
      slug: `other-addon-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    createdTenantIds.push(otherTenant.id);

    // Toggle addon for both tenants.
    await toggleAddon(tenantId, key, true);
    await toggleAddon(otherTenant.id, key, true);

    const result = await getTenantAddons(tenantId);

    // All returned configs must belong to this tenant.
    for (const cfg of result) {
      expect(cfg.tenantId).toBe(tenantId);
    }

    // The other tenant's config should not appear.
    const otherResult = await getTenantAddons(otherTenant.id);
    for (const cfg of otherResult) {
      expect(cfg.tenantId).toBe(otherTenant.id);
    }

    // Ensure our addon appears in this tenant's results.
    const found = result.find((c) => c.addonKey === key);
    expect(found).toBeDefined();
  });

  // ─── updateAddonConfig ────────────────────────────────────────────────────

  it('updateAddonConfig persists JSONB config correctly', async () => {
    const key = await seedAddon(uniqueAddonKey('config-persist'));
    const config = { theme: 'dark', maxRetries: 3 };

    const row = await updateAddonConfig(tenantId, key, config);

    expect(row.tenantId).toBe(tenantId);
    expect(row.addonKey).toBe(key);
    expect(row.config).toEqual(config);
  });

  it('JSONB config round-trips correctly (stored and retrieved without data loss)', async () => {
    const key = await seedAddon(uniqueAddonKey('config-roundtrip'));
    const config = {
      nested: { level1: { level2: 'deep-value' } },
      list: [1, 2, 3],
      flag: true,
      count: 42,
      label: 'hello',
    };

    await updateAddonConfig(tenantId, key, config);

    // Retrieve directly from the database to verify round-trip.
    const [stored] = await db
      .select()
      .from(tenantAddonConfigs)
      .where(eq(tenantAddonConfigs.addonKey, key))
      .limit(1);

    expect(stored).toBeDefined();
    expect(stored.config).toEqual(config);
  });
});
