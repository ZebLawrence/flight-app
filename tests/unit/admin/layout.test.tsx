// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
const mockCookiesGet = vi.fn();
const mockHeadersGet = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookiesGet }),
  headers: () => ({ get: mockHeadersGet }),
}));

vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/components/admin/Sidebar', () => ({
  Sidebar: () => null,
}));

import { validateSession } from '@/lib/auth';

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children without auth check when pathname is /admin/login', async () => {
    mockHeadersGet.mockReturnValue('/admin/login');
    mockCookiesGet.mockReturnValue(undefined);

    const { default: AdminLayout } = await import('@/app/admin/layout');

    const result = await AdminLayout({ children: <div>login page</div> });
    // Should not redirect
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('redirects to /admin/login when no session cookie is present', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin' : null,
    );
    mockCookiesGet.mockReturnValue(undefined);

    vi.resetModules();
    vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
    vi.mock('next/headers', () => ({
      cookies: () => ({ get: mockCookiesGet }),
      headers: () => ({ get: mockHeadersGet }),
    }));
    vi.mock('@/lib/auth', () => ({ validateSession: vi.fn(() => false) }));
    vi.mock('@/components/admin/Sidebar', () => ({ Sidebar: () => null }));

    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>protected</div> });

    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects to /admin/login when session token is invalid', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin/tenants' : null,
    );
    mockCookiesGet.mockReturnValue({ value: 'bad-token' });
    vi.mocked(validateSession).mockReturnValue(false);

    vi.resetModules();
    vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
    vi.mock('next/headers', () => ({
      cookies: () => ({ get: mockCookiesGet }),
      headers: () => ({ get: mockHeadersGet }),
    }));
    vi.mock('@/lib/auth', () => ({
      validateSession: vi.fn(() => false),
    }));
    vi.mock('@/components/admin/Sidebar', () => ({ Sidebar: () => null }));

    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>protected</div> });

    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('renders children with Sidebar when session is valid', async () => {
    mockHeadersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/admin' : null,
    );
    mockCookiesGet.mockReturnValue({ value: 'valid-token' });
    vi.mocked(validateSession).mockReturnValue(true);

    vi.resetModules();
    vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
    vi.mock('next/headers', () => ({
      cookies: () => ({ get: mockCookiesGet }),
      headers: () => ({ get: mockHeadersGet }),
    }));
    vi.mock('@/lib/auth', () => ({
      validateSession: vi.fn(() => true),
    }));
    vi.mock('@/components/admin/Sidebar', () => ({ Sidebar: () => null }));

    const { default: AdminLayout } = await import('@/app/admin/layout');
    const result = await AdminLayout({ children: <div>dashboard</div> });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
