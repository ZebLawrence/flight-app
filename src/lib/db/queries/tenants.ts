import { unstable_cache } from 'next/cache';
import { eq, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import type { Tenant } from '@/lib/db/schema';
import { normalizeHostname, extractSlug } from '@/lib/tenant/hostname';

export type { Tenant } from '@/lib/db/schema';

export type CreateTenantInput = {
  name: string;
  slug: string;
  customDomain?: string | null;
  theme?: Record<string, unknown>;
  enabledAddons?: string[];
  isTemplate?: boolean;
};

export type UpdateTenantInput = {
  name?: string;
  slug?: string;
  customDomain?: string | null;
  theme?: Record<string, unknown>;
  enabledAddons?: string[];
  isTemplate?: boolean;
};

// ---------------------------------------------------------------------------
// Private (uncached) DB implementations
// ---------------------------------------------------------------------------

async function _getTenantBySlug(slug: string): Promise<Tenant | null> {
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

async function _getTenantByHost(hostname: string): Promise<Tenant | null> {
  const normalized = normalizeHostname(hostname);

  const byDomain = await db
    .select()
    .from(tenants)
    .where(eq(tenants.customDomain, normalized))
    .limit(1);

  if (byDomain[0]) return byDomain[0];

  const slug = extractSlug(normalized);
  if (!slug) return null;

  return _getTenantBySlug(slug);
}

async function _getTenantById(id: string): Promise<Tenant | null> {
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  return rows[0] ?? null;
}

async function _listTenants(
  limit: number,
  offset: number,
): Promise<{ data: Tenant[]; total: number }> {
  const [data, [{ value: total }]] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.isTemplate, false)).limit(limit).offset(offset),
    db.select({ value: count() }).from(tenants).where(eq(tenants.isTemplate, false)),
  ]);

  return { data, total };
}

async function _listTemplateTenants(): Promise<Tenant[]> {
  return db.select().from(tenants).where(eq(tenants.isTemplate, true));
}

// ---------------------------------------------------------------------------
// Cached exports for lookup queries (revalidate: 60 s, tag: 'tenants')
// Dynamic arguments are included in keyParts so each unique input has its
// own cache entry.
// ---------------------------------------------------------------------------

/**
 * Looks up a tenant by hostname: checks `custom_domain` first, then by subdomain slug.
 */
export async function getTenantByHost(hostname: string): Promise<Tenant | null> {
  return unstable_cache(_getTenantByHost, ['tenant-by-host', hostname], {
    revalidate: 60,
    tags: ['tenants'],
  })(hostname);
}

/**
 * Looks up a tenant by slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return unstable_cache(_getTenantBySlug, ['tenant-by-slug', slug], {
    revalidate: 60,
    tags: ['tenants'],
  })(slug);
}

/**
 * Looks up a tenant by UUID.
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  return unstable_cache(_getTenantById, ['tenant-by-id', id], {
    revalidate: 60,
    tags: ['tenants'],
  })(id);
}

/**
 * Returns a paginated list of tenants with the total count.
 */
export async function listTenants(
  opts?: { limit?: number; offset?: number },
): Promise<{ data: Tenant[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  return unstable_cache(_listTenants, ['list-tenants', String(limit), String(offset)], {
    revalidate: 60,
    tags: ['tenants'],
  })(limit, offset);
}

/**
 * Returns all template tenants (is_template = true).
 */
export const listTemplateTenants = unstable_cache(
  _listTemplateTenants,
  ['list-template-tenants'],
  { revalidate: 60, tags: ['tenants'] },
);

/**
 * Inserts a new tenant and returns the created row with generated id and timestamps.
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: input.name,
      slug: input.slug,
      customDomain: input.customDomain ?? null,
      theme: input.theme ?? {},
      enabledAddons: input.enabledAddons ?? [],
      isTemplate: input.isTemplate ?? false,
    })
    .returning();

  return tenant;
}

/**
 * Partially updates a tenant by id and returns the updated row.
 * Throws if no tenant with that id exists.
 */
export async function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<Tenant> {
  const rows = await db
    .update(tenants)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, id))
    .returning();

  if (!rows[0]) {
    throw new Error(`Tenant with id "${id}" not found`);
  }

  return rows[0];
}

/**
 * Deletes a tenant by id, cascading to associated pages.
 */
export async function deleteTenant(id: string): Promise<void> {
  await db.delete(tenants).where(eq(tenants.id, id));
}
