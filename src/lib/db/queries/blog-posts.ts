import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import type { BlogPost } from '@/lib/db/schema';

export type { BlogPost } from '@/lib/db/schema';

export type CreatePostInput = {
  tenantId: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  tags?: string[];
  author: string;
  featuredImage?: string | null;
  published?: boolean;
  publishedAt?: Date | null;
};

export type UpdatePostInput = {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  content?: string;
  tags?: string[];
  author?: string;
  featuredImage?: string | null;
  published?: boolean;
  publishedAt?: Date | null;
};

/**
 * Looks up a blog post by tenant and slug.
 */
export async function getPostBySlug(
  tenantId: string,
  slug: string,
): Promise<BlogPost | null> {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.tenantId, tenantId), eq(blogPosts.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns a paginated list of blog posts for a tenant with the total count.
 * When `published: true` is passed, only published posts are returned, ordered by `published_at` desc.
 */
export async function getPostsByTenant(
  tenantId: string,
  opts?: { limit?: number; offset?: number; published?: boolean },
): Promise<{ data: BlogPost[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const where =
    opts?.published === true
      ? and(eq(blogPosts.tenantId, tenantId), eq(blogPosts.published, true))
      : eq(blogPosts.tenantId, tenantId);

  const baseQuery = db.select().from(blogPosts).where(where);
  const countQuery = db.select({ value: count() }).from(blogPosts).where(where);

  const dataQuery =
    opts?.published === true
      ? baseQuery.orderBy(desc(blogPosts.publishedAt)).limit(limit).offset(offset)
      : baseQuery.limit(limit).offset(offset);

  const [data, [{ value: total }]] = await Promise.all([dataQuery, countQuery]);

  return { data, total };
}

/**
 * Inserts a new blog post and returns the created row.
 */
export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const [post] = await db
    .insert(blogPosts)
    .values({
      tenantId: input.tenantId,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: input.content,
      tags: input.tags ?? [],
      author: input.author,
      featuredImage: input.featuredImage ?? null,
      published: input.published ?? false,
      publishedAt: input.publishedAt ?? null,
    })
    .returning();

  return post;
}

/**
 * Partially updates a blog post by id and returns the updated row.
 * Throws if no post with that id exists.
 */
export async function updatePost(
  id: string,
  input: UpdatePostInput,
): Promise<BlogPost> {
  const rows = await db
    .update(blogPosts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id))
    .returning();

  if (!rows[0]) {
    throw new Error(`BlogPost with id "${id}" not found`);
  }

  return rows[0];
}

/**
 * Deletes a blog post by id.
 */
export async function deletePost(id: string): Promise<void> {
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}
