import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ThemeEditor from '@/components/admin/ThemeEditor';
import type { TenantTheme } from '@/lib/types/theme';

const defaultTheme: TenantTheme = {
  colors: {
    primary: '#2563EB',
    secondary: '#7C3AED',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  logo: 'https://example.com/logo.png',
  favicon: 'https://example.com/favicon.ico',
  borderRadius: '8px',
};

describe('ThemeEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all 5 color picker inputs', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/primary color/i)).toHaveAttribute('type', 'color');
    expect(screen.getByLabelText(/secondary color/i)).toHaveAttribute('type', 'color');
    expect(screen.getByLabelText(/accent color/i)).toHaveAttribute('type', 'color');
    expect(screen.getByLabelText(/background color/i)).toHaveAttribute('type', 'color');
    expect(screen.getByLabelText(/text color/i)).toHaveAttribute('type', 'color');
  });

  it('pre-fills color inputs from the initial theme', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/primary color/i)).toHaveValue('#2563eb');
    expect(screen.getByLabelText(/secondary color/i)).toHaveValue('#7c3aed');
    expect(screen.getByLabelText(/accent color/i)).toHaveValue('#f59e0b');
    expect(screen.getByLabelText(/background color/i)).toHaveValue('#ffffff');
    expect(screen.getByLabelText(/text color/i)).toHaveValue('#111827');
  });

  it('renders heading and body font selectors', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/heading font/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/body font/i)).toBeInTheDocument();
  });

  it('font selectors include all common web font options', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    const headingSelect = screen.getByLabelText(/heading font/i);
    const expectedFonts = [
      'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins',
      'Montserrat', 'Playfair Display', 'Merriweather',
    ];
    expectedFonts.forEach((font) => {
      expect(headingSelect).toContainElement(
        headingSelect.querySelector(`option[value="${font}"]`),
      );
    });
  });

  it('pre-fills font selectors from the initial theme', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/heading font/i)).toHaveValue('Inter');
    expect(screen.getByLabelText(/body font/i)).toHaveValue('Inter');
  });

  it('renders logo URL input', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/logo url/i)).toHaveValue('https://example.com/logo.png');
  });

  it('renders favicon URL input', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/favicon url/i)).toHaveValue('https://example.com/favicon.ico');
  });

  it('renders border radius range input', () => {
    render(<ThemeEditor theme={defaultTheme} onChange={vi.fn()} />);
    const slider = screen.getByLabelText(/border radius/i);
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('8');
  });

  it('calls onChange with updated theme when a color changes', () => {
    const handleChange = vi.fn();
    render(<ThemeEditor theme={defaultTheme} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/primary color/i), {
      target: { value: '#ff0000' },
    });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: TenantTheme = handleChange.mock.calls[0][0];
    expect(updated.colors.primary).toBe('#ff0000');
    expect(updated.colors.secondary).toBe(defaultTheme.colors.secondary);
  });

  it('calls onChange with updated theme when heading font changes', () => {
    const handleChange = vi.fn();
    render(<ThemeEditor theme={defaultTheme} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/heading font/i), {
      target: { value: 'Poppins' },
    });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: TenantTheme = handleChange.mock.calls[0][0];
    expect(updated.fonts.heading).toBe('Poppins');
    expect(updated.fonts.body).toBe(defaultTheme.fonts.body);
  });

  it('calls onChange with updated theme when logo URL changes', () => {
    const handleChange = vi.fn();
    render(<ThemeEditor theme={defaultTheme} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/logo url/i), {
      target: { value: 'https://new.example.com/logo.png' },
    });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: TenantTheme = handleChange.mock.calls[0][0];
    expect(updated.logo).toBe('https://new.example.com/logo.png');
  });

  it('calls onChange with updated theme when favicon URL changes', () => {
    const handleChange = vi.fn();
    render(<ThemeEditor theme={defaultTheme} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/favicon url/i), {
      target: { value: 'https://new.example.com/favicon.ico' },
    });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: TenantTheme = handleChange.mock.calls[0][0];
    expect(updated.favicon).toBe('https://new.example.com/favicon.ico');
  });

  it('calls onChange with updated borderRadius when slider changes', () => {
    const handleChange = vi.fn();
    render(<ThemeEditor theme={defaultTheme} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/border radius/i), {
      target: { value: '16' },
    });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: TenantTheme = handleChange.mock.calls[0][0];
    expect(updated.borderRadius).toBe('16px');
  });

  it('handles missing optional fields gracefully (logo, favicon, borderRadius undefined)', () => {
    const themeWithoutOptionals: TenantTheme = {
      colors: defaultTheme.colors,
      fonts: defaultTheme.fonts,
    };
    render(<ThemeEditor theme={themeWithoutOptionals} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/logo url/i)).toHaveValue('');
    expect(screen.getByLabelText(/favicon url/i)).toHaveValue('');
    expect(screen.getByLabelText(/border radius/i)).toHaveValue('0');
  });
});
