import { and, count, desc, eq, not, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pageVersions } from '@/lib/db/schema';
import type { PageVersion } from '@/lib/db/schema';

export type { PageVersion } from '@/lib/db/schema';

/**
 * Inserts a new version row for a page and returns the created row.
 */
export async function createVersion(
  pageId: string,
  content: unknown,
  title: string,
  createdBy?: string,
): Promise<PageVersion> {
  const [version] = await db
    .insert(pageVersions)
    .values({
      pageId,
      content,
      title,
      createdBy: createdBy ?? null,
    })
    .returning();

  return version;
}

/**
 * Returns versions for a page ordered newest-first, with optional pagination.
 */
export async function getVersionsByPage(
  pageId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: PageVersion[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const where = eq(pageVersions.pageId, pageId);

  const [data, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(pageVersions)
      .where(where)
      .orderBy(desc(pageVersions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(pageVersions).where(where),
  ]);

  return { data, total };
}

/**
 * Returns a specific version by its ID, or null if not found.
 */
export async function getVersion(
  versionId: string,
): Promise<PageVersion | null> {
  const rows = await db
    .select()
    .from(pageVersions)
    .where(eq(pageVersions.id, versionId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Deletes all versions for a page except the `keepCount` most recent.
 */
export async function pruneVersions(pageId: string, keepCount: number): Promise<void> {
  const keepSubquery = db
    .select({ id: pageVersions.id })
    .from(pageVersions)
    .where(eq(pageVersions.pageId, pageId))
    .orderBy(desc(pageVersions.createdAt))
    .limit(keepCount);

  await db
    .delete(pageVersions)
    .where(and(eq(pageVersions.pageId, pageId), not(inArray(pageVersions.id, keepSubquery))));
}
