import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import type { Media } from '@/lib/db/schema';

export type { Media } from '@/lib/db/schema';

export type CreateMediaInput = {
  tenantId: string;
  filename: string;
  s3Key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Returns a paginated list of media records for a tenant with the total count.
 */
export async function getMediaByTenant(
  tenantId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: Media[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const where = eq(media.tenantId, tenantId);

  const [data, [{ value: total }]] = await Promise.all([
    db.select().from(media).where(where).limit(limit).offset(offset),
    db.select({ value: count() }).from(media).where(where),
  ]);

  return { data, total };
}

/**
 * Inserts a new media record and returns the created row.
 */
export async function createMedia(input: CreateMediaInput): Promise<Media> {
  const [row] = await db
    .insert(media)
    .values({
      tenantId: input.tenantId,
      filename: input.filename,
      s3Key: input.s3Key,
      url: input.url,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    })
    .returning();

  return row;
}

/**
 * Deletes a media record by id.
 */
export async function deleteMedia(id: string): Promise<void> {
  await db.delete(media).where(eq(media.id, id));
}
