// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@/components/admin/TenantForm', () => ({
  default: () => ({ type: 'form', props: {} }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    ({ type: 'a', props: { href, children, className } }),
}));

describe('NewTenantPage', () => {
  let NewTenantPage: () => unknown;

  beforeAll(async () => {
    const mod = await import('@/app/admin/tenants/new/page');
    NewTenantPage = mod.default;
  });

  it('renders without throwing', () => {
    expect(() => NewTenantPage()).not.toThrow();
  });

  it('includes a breadcrumb link back to /admin/tenants', () => {
    const result = NewTenantPage();
    const json = JSON.stringify(result);
    expect(json).toContain('/admin/tenants');
  });

  it('renders the Create tenant heading', () => {
    const result = NewTenantPage();
    const json = JSON.stringify(result);
    expect(json).toContain('Create tenant');
  });
});
