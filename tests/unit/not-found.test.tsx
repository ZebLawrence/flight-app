import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const mockGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: () => ({ get: mockGet }),
}));

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn(),
}));

import { resolveTenant } from '@/lib/tenant/resolve';
import TenantNotFoundPage from '@/app/(tenant)/not-found';

const mockResolveTenant = resolveTenant as ReturnType<typeof vi.fn>;

describe('TenantNotFoundPage', () => {
  beforeEach(() => {
    mockGet.mockReturnValue(null);
    mockResolveTenant.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders "Page not found" heading', async () => {
    const jsx = await TenantNotFoundPage();
    render(jsx);
    expect(screen.getByRole('heading', { name: 'Page not found' })).not.toBeNull();
  });

  it('renders a "Go to homepage" link pointing to /', async () => {
    const jsx = await TenantNotFoundPage();
    render(jsx);
    const link = screen.getByRole('link', { name: 'Go to homepage' });
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('renders homepage link with primary color styling', async () => {
    const jsx = await TenantNotFoundPage();
    const { container } = render(jsx);
    const anchor = container.querySelector('a[href="/"]') as HTMLAnchorElement | null;
    expect(anchor).not.toBeNull();
    expect(anchor?.style.backgroundColor).toBe('var(--color-primary)');
  });

  it('applies ThemeProvider CSS variables via a <style> tag', async () => {
    const jsx = await TenantNotFoundPage();
    const { container } = render(jsx);
    const style = container.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('--color-primary');
  });

  it('uses tenant theme when tenant is resolved', async () => {
    mockResolveTenant.mockResolvedValue({
      id: '1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: null,
      theme: {
        colors: {
          primary: '#FF0000',
          secondary: '#00FF00',
          accent: '#0000FF',
          background: '#FFFFFF',
          text: '#000000',
        },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
    });

    const jsx = await TenantNotFoundPage();
    const { container } = render(jsx);
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('--color-primary: #FF0000');
  });

  it('renders tenant logo when theme.logo is set', async () => {
    mockResolveTenant.mockResolvedValue({
      id: '1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: null,
      theme: {
        logo: 'https://example.com/logo.png',
        colors: {
          primary: '#2563EB',
          secondary: '#7C3AED',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#111827',
        },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
    });

    const jsx = await TenantNotFoundPage();
    const { container } = render(jsx);
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/logo.png');
    expect(img?.getAttribute('alt')).toBe('Demo Corp');
  });

  it('does not render an img when tenant has no logo', async () => {
    mockResolveTenant.mockResolvedValue({
      id: '1',
      name: 'Demo Corp',
      slug: 'demo',
      customDomain: null,
      theme: {
        colors: {
          primary: '#2563EB',
          secondary: '#7C3AED',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#111827',
        },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
    });

    const jsx = await TenantNotFoundPage();
    const { container } = render(jsx);
    expect(container.querySelector('img')).toBeNull();
  });
});
