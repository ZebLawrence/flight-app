import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { addons, tenantAddonConfigs } from '@/lib/db/schema';
import type { Addon, TenantAddonConfig } from '@/lib/db/schema';

export type { Addon, TenantAddonConfig } from '@/lib/db/schema';

/**
 * Looks up an add-on by its unique key.
 */
export async function getAddonByKey(key: string): Promise<Addon | null> {
  const rows = await db
    .select()
    .from(addons)
    .where(eq(addons.key, key))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns all available add-ons in the global catalog.
 */
export async function listAddons(): Promise<Addon[]> {
  return db.select().from(addons);
}

/**
 * Returns all add-on configs for a specific tenant.
 */
export async function getTenantAddons(tenantId: string): Promise<TenantAddonConfig[]> {
  return db
    .select()
    .from(tenantAddonConfigs)
    .where(eq(tenantAddonConfigs.tenantId, tenantId));
}

/**
 * Enables or disables an add-on for a tenant.
 * Creates the config row on first call (upsert), updates `enabled` on subsequent calls.
 */
export async function toggleAddon(
  tenantId: string,
  addonKey: string,
  enabled: boolean,
): Promise<TenantAddonConfig> {
  const [row] = await db
    .insert(tenantAddonConfigs)
    .values({ tenantId, addonKey, enabled, config: {} })
    .onConflictDoUpdate({
      target: [tenantAddonConfigs.tenantId, tenantAddonConfigs.addonKey],
      set: { enabled },
    })
    .returning();

  return row;
}

/**
 * Updates the per-tenant JSONB config for an add-on.
 * Creates the config row if it does not yet exist.
 */
export async function updateAddonConfig(
  tenantId: string,
  addonKey: string,
  config: Record<string, unknown>,
): Promise<TenantAddonConfig> {
  const [row] = await db
    .insert(tenantAddonConfigs)
    .values({ tenantId, addonKey, config, enabled: false })
    .onConflictDoUpdate({
      target: [tenantAddonConfigs.tenantId, tenantAddonConfigs.addonKey],
      set: { config },
    })
    .returning();

  return row;
}
