import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeHostname, extractSlug } from '@/lib/tenant/hostname';
import { resolveTenant } from '@/lib/tenant/resolve';

type TenantLike = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
};

function makeTenant(overrides: Partial<TenantLike> = {}): TenantLike {
  return {
    id: overrides.id ?? 'tenant-id',
    name: overrides.name ?? 'Tenant',
    slug: overrides.slug ?? 'demo',
    customDomain: overrides.customDomain ?? null,
  };
}

function makeDeps(opts?: {
  byCustomDomain?: TenantLike | null;
  bySlug?: TenantLike | null;
  internal?: TenantLike | null;
}) {
  return {
    findByCustomDomain: vi.fn(async () => opts?.byCustomDomain ?? null),
    findBySlug: vi.fn(async () => opts?.bySlug ?? null),
    findInternalTenant: vi.fn(async () => opts?.internal ?? null),
  };
}

describe('hostname helpers', () => {
  it('normalizes mixed-case hostnames to lowercase', () => {
    expect(normalizeHostname('DeMo.LocalHost')).toBe('demo.localhost');
  });

  it('strips port from hostname', () => {
    expect(normalizeHostname('demo.localhost:3000')).toBe('demo.localhost');
  });

  it('strips www prefix', () => {
    expect(normalizeHostname('www.demo.localhost')).toBe('demo.localhost');
  });

  it('maps 127.0.0.1 to localhost', () => {
    expect(normalizeHostname('127.0.0.1')).toBe('localhost');
    expect(normalizeHostname('127.0.0.1:3000')).toBe('localhost');
  });

  it('extracts localhost subdomain slug', () => {
    expect(extractSlug('demo.localhost')).toBe('demo');
  });

  it('extracts full multi-label localhost prefix as slug', () => {
    expect(extractSlug('foo.bar.localhost')).toBe('foo.bar');
  });

  it('returns empty slug for bare localhost', () => {
    expect(extractSlug('localhost')).toBe('');
  });
});

describe('resolveTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tenant when hostname matches custom_domain', async () => {
    const tenant = makeTenant({ customDomain: 'demo.localhost' });
    const deps = makeDeps({ byCustomDomain: tenant });

    const result = await resolveTenant('demo.localhost', deps);

    expect(result).toEqual(tenant);
    expect(deps.findByCustomDomain).toHaveBeenCalledWith('demo.localhost');
  });

  it('custom_domain match is exact after normalization', async () => {
    const tenant = makeTenant({ customDomain: 'demo.localhost' });
    const deps = makeDeps({ byCustomDomain: tenant });

    const result = await resolveTenant('WWW.DEMO.LOCALHOST:3000', deps);

    expect(result).toEqual(tenant);
    expect(deps.findByCustomDomain).toHaveBeenCalledWith('demo.localhost');
  });

  it('returns tenant when slug from hostname matches tenant.slug', async () => {
    const tenant = makeTenant({ slug: 'demo' });
    const deps = makeDeps({ bySlug: tenant });

    const result = await resolveTenant('demo.localhost', deps);

    expect(result).toEqual(tenant);
    expect(deps.findBySlug).toHaveBeenCalledWith('demo');
  });

  it('returns null when no tenant matches hostname', async () => {
    const deps = makeDeps({ byCustomDomain: null, bySlug: null, internal: null });

    const result = await resolveTenant('nonexistent.localhost', deps);

    expect(result).toBeNull();
  });

  it('custom_domain match takes priority over slug match', async () => {
    const customTenant = makeTenant({ id: 'custom', customDomain: 'demo.localhost' });
    const slugTenant = makeTenant({ id: 'slug', slug: 'demo' });
    const deps = makeDeps({ byCustomDomain: customTenant, bySlug: slugTenant });

    const result = await resolveTenant('demo.localhost', deps);

    expect(result?.id).toBe('custom');
    expect(deps.findBySlug).not.toHaveBeenCalled();
  });

  it('handles localhost subdomains (demo.localhost -> slug demo)', async () => {
    const tenant = makeTenant({ slug: 'demo' });
    const deps = makeDeps({ bySlug: tenant });

    const result = await resolveTenant('demo.localhost', deps);

    expect(result).toEqual(tenant);
  });

  it('handles bare localhost and resolves internal test tenant', async () => {
    const internal = makeTenant({ slug: 'internal', customDomain: 'localhost' });
    const deps = makeDeps({ internal });

    const result = await resolveTenant('localhost', deps);

    expect(result).toEqual(internal);
    expect(deps.findInternalTenant).toHaveBeenCalled();
  });

  it('handles 127.0.0.1 by mapping to internal test tenant', async () => {
    const internal = makeTenant({ slug: 'internal', customDomain: 'localhost' });
    const deps = makeDeps({ internal });

    const result = await resolveTenant('127.0.0.1:3000', deps);

    expect(result).toEqual(internal);
  });

  it('handles internal.localhost by resolving slug internal', async () => {
    const internal = makeTenant({ slug: 'internal', customDomain: 'localhost' });
    const deps = makeDeps({ bySlug: internal });

    const result = await resolveTenant('internal.localhost', deps);

    expect(result).toEqual(internal);
  });

  it('handles multi-label subdomains using full prefix as slug', async () => {
    const tenant = makeTenant({ slug: 'foo.bar' });
    const deps = makeDeps({ bySlug: tenant });

    const result = await resolveTenant('foo.bar.localhost', deps);

    expect(result).toEqual(tenant);
    expect(deps.findBySlug).toHaveBeenCalledWith('foo.bar');
  });
});
