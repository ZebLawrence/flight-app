// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const mockListTenants = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/queries/tenants', () => ({
  listTenants: mockListTenants,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    ({ type: 'a', props: { href, children, className } }),
}));

const tenant1 = {
  id: 'uuid-1',
  name: 'Tenant One',
  slug: 'tenant-one',
  customDomain: 'one.example.com',
  theme: {},
  enabledAddons: [],
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

const tenant2 = {
  id: 'uuid-2',
  name: 'Tenant Two',
  slug: 'tenant-two',
  customDomain: null,
  theme: {},
  enabledAddons: [],
  createdAt: new Date('2024-02-20T00:00:00Z'),
  updatedAt: new Date('2024-02-20T00:00:00Z'),
};

describe('AdminTenantsPage', () => {
  let AdminTenantsPage: () => Promise<unknown>;

  beforeAll(async () => {
    const mod = await import('@/app/admin/tenants/page');
    AdminTenantsPage = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls listTenants to fetch tenants on render', async () => {
    mockListTenants.mockResolvedValue({ data: [], total: 0 });
    await AdminTenantsPage();
    expect(mockListTenants).toHaveBeenCalledTimes(1);
  });

  it('returns a result when tenants are present', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1, tenant2], total: 2 });
    const result = await AdminTenantsPage();
    expect(result).toBeDefined();
  });

  it('returns a result for empty tenant list (empty state)', async () => {
    mockListTenants.mockResolvedValue({ data: [], total: 0 });
    const result = await AdminTenantsPage();
    expect(result).toBeDefined();
  });

  it('includes a link to create a new tenant', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1], total: 1 });
    const result = await AdminTenantsPage();
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants/new');
  });

  it('includes per-row links to tenant detail pages', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1, tenant2], total: 2 });
    const result = await AdminTenantsPage();
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants/uuid-1');
    expect(json).toContain('/admin/tenants/uuid-2');
  });

  it('includes tenant name, slug, and custom domain in the output', async () => {
    mockListTenants.mockResolvedValue({ data: [tenant1], total: 1 });
    const result = await AdminTenantsPage();
    const json = JSON.stringify(result);
    expect(json).toContain('Tenant One');
    expect(json).toContain('tenant-one');
    expect(json).toContain('one.example.com');
  });

  it('renders a create tenant link even in the empty state', async () => {
    mockListTenants.mockResolvedValue({ data: [], total: 0 });
    const result = await AdminTenantsPage();
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants/new');
  });
});
