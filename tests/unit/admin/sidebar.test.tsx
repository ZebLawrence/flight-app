import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Sidebar } from '@/components/admin/Sidebar';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a Tenants link pointing to /admin/tenants', () => {
    render(<Sidebar />);
    const tenantsLink = screen.getByRole('link', { name: /tenants/i });
    expect(tenantsLink).toBeInTheDocument();
    expect(tenantsLink).toHaveAttribute('href', '/admin/tenants');
  });

  it('renders a Logout button', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls DELETE /api/admin/auth and redirects to /admin/login on logout', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth', {
        method: 'DELETE',
      });
      expect(mockPush).toHaveBeenCalledWith('/admin/login');
    });
  });
});
