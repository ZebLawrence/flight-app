import { boolean, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  tags: text('tags').array().notNull().default([]),
  author: text('author').notNull(),
  featuredImage: text('featured_image'),
  published: boolean('published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('blog_posts_tenant_id_idx').on(table.tenantId),
  slugIdx: index('blog_posts_slug_idx').on(table.slug),
  tenantSlugUniq: unique('blog_posts_tenant_slug_uniq').on(table.tenantId, table.slug),
}));

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
