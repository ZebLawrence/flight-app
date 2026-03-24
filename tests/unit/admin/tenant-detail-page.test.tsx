// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const mockGetTenantById = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }));

vi.mock('@/lib/db/queries/tenants', () => ({
  getTenantById: mockGetTenantById,
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    ({ type: 'a', props: { href, children, className } }),
}));

vi.mock('@/components/admin/TenantEditForm', () => ({
  default: ({ tenant }: { tenant: { id: string; name: string } }) =>
    ({ type: 'div', props: { 'data-testid': 'tenant-edit-form', 'data-tenant-id': tenant.id } }),
}));

const mockTenant = {
  id: 'uuid-abc',
  name: 'Acme Corp',
  slug: 'acme-corp',
  customDomain: 'acme.example.com',
  theme: {},
  enabledAddons: [],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('TenantDetailPage', () => {
  let TenantDetailPage: (props: { params: { id: string } }) => Promise<unknown>;

  beforeAll(async () => {
    const mod = await import('@/app/admin/tenants/[id]/page');
    TenantDetailPage = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the tenant by id', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    await TenantDetailPage({ params: { id: 'uuid-abc' } });
    expect(mockGetTenantById).toHaveBeenCalledWith('uuid-abc');
  });

  it('calls notFound() when tenant does not exist', async () => {
    mockGetTenantById.mockResolvedValue(null);
    await expect(TenantDetailPage({ params: { id: 'missing' } })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('includes tenant name in the output', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    const result = await TenantDetailPage({ params: { id: 'uuid-abc' } });
    const json = JSON.stringify(result);
    expect(json).toContain('Acme Corp');
  });

  it('includes a breadcrumb link back to /admin/tenants', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    const result = await TenantDetailPage({ params: { id: 'uuid-abc' } });
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants');
  });

  it('includes a link to the pages for this tenant', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    const result = await TenantDetailPage({ params: { id: 'uuid-abc' } });
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants/uuid-abc/pages');
  });

  it('includes a link to the media library for this tenant', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    const result = await TenantDetailPage({ params: { id: 'uuid-abc' } });
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants/uuid-abc/media');
  });

  it('passes the tenant data to the edit form component', async () => {
    mockGetTenantById.mockResolvedValue(mockTenant);
    const result = await TenantDetailPage({ params: { id: 'uuid-abc' } });
    const json = JSON.stringify(result);
    // The tenant props are serialized as part of the component element tree
    expect(json).toContain('"tenant"');
    expect(json).toContain('uuid-abc');
  });
});
