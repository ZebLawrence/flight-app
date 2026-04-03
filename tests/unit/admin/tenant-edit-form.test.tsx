import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import TenantEditForm from '@/components/admin/TenantEditForm';

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

describe('TenantEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with form fields pre-filled from tenant data', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    expect(screen.getByLabelText(/name/i)).toHaveValue('Acme Corp');
    expect(screen.getByLabelText(/slug/i)).toHaveValue('acme-corp');
    expect(screen.getByLabelText(/custom domain/i)).toHaveValue('acme.example.com');
  });

  it('renders the Basic Info tab by default', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('switches to Domain Settings tab on click', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.getByText(/dns setup instructions/i)).toBeInTheDocument();
  });

  it('shows current custom domain in Domain Settings tab', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.getByText(/current custom domain/i)).toBeInTheDocument();
    expect(screen.getByText('acme.example.com')).toBeInTheDocument();
  });

  it('shows CNAME target platform.yourhost.com when custom domain is configured', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.getByText('platform.yourhost.com')).toBeInTheDocument();
  });

  it('shows propagation note when custom domain is configured', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.getByText(/up to 48 hours/i)).toBeInTheDocument();
  });

  it('shows no custom domain message when customDomain is null', () => {
    render(<TenantEditForm tenant={{ ...mockTenant, customDomain: null }} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.getByText(/no custom domain configured/i)).toBeInTheDocument();
  });

  it('does not show DNS instructions when customDomain is null', () => {
    render(<TenantEditForm tenant={{ ...mockTenant, customDomain: null }} />);
    fireEvent.click(screen.getByRole('button', { name: /domain settings/i }));
    expect(screen.queryByText(/dns setup instructions/i)).not.toBeInTheDocument();
    expect(screen.queryByText('platform.yourhost.com')).not.toBeInTheDocument();
  });

  it('PUTs to /api/admin/tenants/[id] with updated values', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockTenant, name: 'Acme Updated' }),
    });

    render(<TenantEditForm tenant={mockTenant} />);

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Acme Updated' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/tenants/${mockTenant.id}`,
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('Acme Updated'),
      }),
    );
  });

  it('shows success message after successful save', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockTenant,
    });

    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/updated successfully/i);
    });
  });

  it('shows duplicate slug error on 409 response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Duplicate slug' }),
    });

    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/slug.*taken|already taken/i);
    });
  });

  it('shows generic error message when fetch throws', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unable to connect/i);
    });
  });

  it('shows API error message on non-409 failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Internal server error');
    });
  });

  it('does not call fetch when name is empty on submit', () => {
    render(<TenantEditForm tenant={{ ...mockTenant, name: '' }} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    // HTML5 required attribute blocks submission; fetch must not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not call fetch when slug is empty on submit', () => {
    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.change(screen.getByLabelText(/slug/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    // HTML5 required attribute blocks submission; fetch must not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends null customDomain when field is cleared', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockTenant, customDomain: null }),
    });

    render(<TenantEditForm tenant={mockTenant} />);
    fireEvent.change(screen.getByLabelText(/custom domain/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.customDomain).toBeNull();
  });
});
