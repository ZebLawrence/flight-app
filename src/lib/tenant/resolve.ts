import { eq, and } from 'drizzle-orm';
import { normalizeHostname, extractSlug } from './hostname';

export type ResolvedTenant = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  [key: string]: unknown;
};

type ResolveTenantDeps = {
  findByCustomDomain: (domain: string) => Promise<ResolvedTenant | null>;
  findBySlug: (slug: string) => Promise<ResolvedTenant | null>;
  findInternalTenant: () => Promise<ResolvedTenant | null>;
};

let defaultDepsPromise: Promise<ResolveTenantDeps> | null = null;

async function getDefaultDeps(): Promise<ResolveTenantDeps> {
  if (!defaultDepsPromise) {
    defaultDepsPromise = (async () => {
      const [{ db }, schema] = await Promise.all([
        import('@/lib/db'),
        import('@/lib/db/schema'),
      ]);
      const { tenants } = schema;

      const deps: ResolveTenantDeps = {
        async findByCustomDomain(domain: string) {
          const customDomainMatches = await db
            .select()
            .from(tenants)
            .where(eq(tenants.customDomain, domain))
            .limit(1);

          return (customDomainMatches[0] as ResolvedTenant | undefined) ?? null;
        },
        async findBySlug(slug: string) {
          const slugMatches = await db
            .select()
            .from(tenants)
            .where(eq(tenants.slug, slug))
            .limit(1);

          return (slugMatches[0] as ResolvedTenant | undefined) ?? null;
        },
        async findInternalTenant() {
          const internalMatches = await db
            .select()
            .from(tenants)
            .where(
              and(
                eq(tenants.slug, 'internal'),
                eq(tenants.customDomain, 'localhost'),
              ),
            )
            .limit(1);

          return (internalMatches[0] as ResolvedTenant | undefined) ?? null;
        },
      };

      return deps;
    })();
  }

  return defaultDepsPromise;
}

export async function resolveTenant(hostname: string, deps?: ResolveTenantDeps) {
  const resolveDeps = deps ?? (await getDefaultDeps());
  const normalized = normalizeHostname(hostname || '');

  if (!normalized) {
    return null;
  }

  // 1) Custom domain exact match (priority)
  const customDomainTenant = await resolveDeps.findByCustomDomain(normalized);
  if (customDomainTenant) {
    return customDomainTenant;
  }

  // 2) Slug fallback from hostname prefix
  const slug = extractSlug(normalized);

  // Bare localhost should resolve to internal test tenant
  if (normalized === 'localhost' || slug === '') {
    const internalTenant = await resolveDeps.findInternalTenant();
    if (internalTenant) {
      return internalTenant;
    }
    return null;
  }

  const slugTenant = await resolveDeps.findBySlug(slug);
  if (slugTenant) {
    return slugTenant;
  }

  return null;
}
