import { unstable_cache } from 'next/cache';
import { eq, count, and, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pages } from '@/lib/db/schema';
import type { Page } from '@/lib/db/schema';

export type { Page } from '@/lib/db/schema';

export type CreatePageInput = {
  tenantId: string;
  slug: string;
  title: string;
  content?: Record<string, unknown>;
  published?: boolean;
  sortOrder?: number;
  meta?: Record<string, unknown> | null;
};

export type UpdatePageInput = {
  title?: string;
  slug?: string;
  content?: Record<string, unknown>;
  published?: boolean;
  sortOrder?: number;
  meta?: Record<string, unknown> | null;
};

// ---------------------------------------------------------------------------
// Private (uncached) DB implementations
// ---------------------------------------------------------------------------

async function _getPageById(id: string): Promise<Page | null> {
  const rows = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return rows[0] ?? null;
}

async function _getPageBySlug(tenantId: string, slug: string): Promise<Page | null> {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

async function _getPagesByTenant(
  tenantId: string,
  limit: number,
  offset: number,
): Promise<{ data: Page[]; total: number }> {
  const [data, [{ value: total }]] = await Promise.all([
    db.select().from(pages).where(eq(pages.tenantId, tenantId)).limit(limit).offset(offset),
    db.select({ value: count() }).from(pages).where(eq(pages.tenantId, tenantId)),
  ]);

  return { data, total };
}

// ---------------------------------------------------------------------------
// Cached exports for lookup queries (revalidate: 60 s)
// Dynamic arguments are included in keyParts so each unique input has its
// own cache entry.
// ---------------------------------------------------------------------------

/**
 * Looks up a page by its primary key.
 */
export async function getPageById(id: string): Promise<Page | null> {
  return unstable_cache(_getPageById, ['page-by-id', id], {
    revalidate: 60,
    tags: ['pages'],
  })(id);
}

/**
 * Looks up a page by slug scoped to a tenant.
 * Tagged with both `pages` and `tenant-{tenantId}` for per-tenant invalidation.
 */
export async function getPageBySlug(tenantId: string, slug: string): Promise<Page | null> {
  return unstable_cache(_getPageBySlug, ['page-by-slug', tenantId], {
    revalidate: 60,
    tags: ['pages', `tenant-${tenantId}`],
  })(tenantId, slug);
}

/**
 * Returns a paginated list of pages for a tenant with the total count.
 * Tagged with both `pages` and `tenant-{tenantId}` for per-tenant invalidation.
 */
export async function getPagesByTenant(
  tenantId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: Page[]; total: number }> {
  return unstable_cache(_getPagesByTenant, ['pages-by-tenant', tenantId], {
    revalidate: 60,
    tags: ['pages', `tenant-${tenantId}`],
  })(tenantId, opts?.limit ?? 50, opts?.offset ?? 0);
}

/**
 * Inserts a new page and returns the created row.
 */
export async function createPage(input: CreatePageInput): Promise<Page> {
  const [page] = await db
    .insert(pages)
    .values({
      tenantId: input.tenantId,
      slug: input.slug,
      title: input.title,
      content: input.content ?? {},
      published: input.published ?? true,
      sortOrder: input.sortOrder ?? 0,
      meta: input.meta ?? null,
    })
    .returning();

  return page;
}

/**
 * Partially updates a page by id, refreshing `updated_at`, and returns the updated row.
 * Throws if no page with that id exists.
 */
export async function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  const rows = await db
    .update(pages)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, id))
    .returning();

  if (!rows[0]) {
    throw new Error(`Page with id "${id}" not found`);
  }

  return rows[0];
}

/**
 * Deletes a page by id.
 */
export async function deletePage(id: string): Promise<void> {
  await db.delete(pages).where(eq(pages.id, id));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Updates the `sort_order` for multiple pages belonging to a tenant in a single DB call.
 * The position of each id in `orderedIds` determines its new `sort_order` (0-based).
 */
export async function reorderPages(tenantId: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;

  if (!orderedIds.every((id) => UUID_RE.test(id))) {
    throw new Error('All page IDs must be valid UUIDs');
  }

  let caseExpr = sql`CASE id`;
  for (let i = 0; i < orderedIds.length; i++) {
    caseExpr = sql`${caseExpr} WHEN ${orderedIds[i]}::uuid THEN ${i}`;
  }
  caseExpr = sql`(${caseExpr} END)::integer`;

  const updated = await db
    .update(pages)
    .set({ sortOrder: caseExpr })
    .where(and(eq(pages.tenantId, tenantId), inArray(pages.id, orderedIds)))
    .returning({ id: pages.id });

  if (updated.length !== orderedIds.length) {
    throw new Error('One or more page IDs not found');
  }
}
