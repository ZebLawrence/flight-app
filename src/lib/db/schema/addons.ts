import { boolean, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const addons = pgTable('addons', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  configSchema: jsonb('config_schema').notNull().default({}),
});

export const tenantAddonConfigs = pgTable('tenant_addon_configs', {
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  addonKey: text('addon_key')
    .notNull()
    .references(() => addons.key, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().default({}),
  enabled: boolean('enabled').notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.addonKey] }),
}));

export type Addon = typeof addons.$inferSelect;
export type NewAddon = typeof addons.$inferInsert;
export type TenantAddonConfig = typeof tenantAddonConfigs.$inferSelect;
export type NewTenantAddonConfig = typeof tenantAddonConfigs.$inferInsert;
