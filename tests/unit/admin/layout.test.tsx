// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
const mockCookiesGet = vi.fn();
const mockHeadersGet = vi.fn();
const mockValidateSession = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookiesGet }),
  headers: () => ({ get: mockHeadersGet }),
}));

vi.mock('@/lib/auth', () => ({
  validateSession: mockValidateSession,
}));

vi.mock('@/components/admin/Sidebar', () => ({
  Sidebar: () => null,
}));

describe('AdminLayout', () => {
  let AdminLayout: (props: { children: React.ReactNode }) => Promise<React.ReactNode>;

  beforeAll(async () => {
    const mod = await import('@/app/admin/layout');
    AdminLayout = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children without auth check when pathname is /admin/login', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin/login' : null,
    );
    mockCookiesGet.mockReturnValue(undefined);

    const result = await AdminLayout({ children: <div>login page</div> });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('redirects to /admin/login when no session cookie is present', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin' : null,
    );
    mockCookiesGet.mockReturnValue(undefined);
    mockValidateSession.mockReturnValue(false);

    await AdminLayout({ children: <div>protected</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects to /admin/login when session token is invalid', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin/tenants' : null,
    );
    mockCookiesGet.mockReturnValue({ value: 'bad-token' });
    mockValidateSession.mockReturnValue(false);

    await AdminLayout({ children: <div>protected</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('renders children with Sidebar when session is valid', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin' : null,
    );
    mockCookiesGet.mockReturnValue({ value: 'valid-token' });
    mockValidateSession.mockReturnValue(true);

    const result = await AdminLayout({ children: <div>dashboard</div> });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
