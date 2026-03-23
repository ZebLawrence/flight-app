import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

describe('ThemeProvider component', () => {
  it('renders a <style> tag containing --color-primary', () => {
    const theme = {
      colors: {
        primary: '#FF0000',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#111827',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
    };
    const { container } = render(<ThemeProvider theme={theme} />);
    const style = container.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('--color-primary: #FF0000');
  });

  it('contains all 5 color tokens in the style output', () => {
    const { container } = render(<ThemeProvider />);
    const style = container.querySelector('style');
    const text = style?.textContent ?? '';
    expect(text).toContain('--color-primary');
    expect(text).toContain('--color-secondary');
    expect(text).toContain('--color-accent');
    expect(text).toContain('--color-background');
    expect(text).toContain('--color-text');
  });

  it('contains font family tokens --font-heading and --font-body', () => {
    const { container } = render(<ThemeProvider />);
    const style = container.querySelector('style');
    const text = style?.textContent ?? '';
    expect(text).toContain('--font-heading');
    expect(text).toContain('--font-body');
  });

  it('falls back to defaults when theme fields are missing', () => {
    const { container } = render(<ThemeProvider theme={{ colors: { primary: '#123456' } as never }} />);
    const style = container.querySelector('style');
    const text = style?.textContent ?? '';
    expect(text).toContain('--color-primary: #123456');
    expect(text).toContain('--color-secondary: #7C3AED');
    expect(text).toContain('--color-background: #FFFFFF');
  });

  it('empty theme object produces all default CSS variables without crashing', () => {
    const { container } = render(<ThemeProvider theme={{}} />);
    const style = container.querySelector('style');
    const text = style?.textContent ?? '';
    expect(text).toContain('--color-primary: #2563EB');
    expect(text).toContain('--color-secondary: #7C3AED');
    expect(text).toContain('--color-accent: #F59E0B');
    expect(text).toContain('--color-background: #FFFFFF');
    expect(text).toContain('--color-text: #111827');
    expect(text).toContain('--font-heading');
    expect(text).toContain('--font-body');
  });
});
