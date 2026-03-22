import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  s3Key: text('s3_key').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('media_tenant_id_idx').on(table.tenantId),
}));

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
