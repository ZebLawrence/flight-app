import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Link } from '@/components/cms/content/Link';

describe('Link component', () => {
  it('renders an <a> tag with correct href and text content', () => {
    const { container } = render(<Link href="/about" text="About Us" />);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/about');
    expect(screen.getByText('About Us')).not.toBeNull();
  });

  it('applies the target attribute when provided', () => {
    const { container } = render(
      <Link href="https://example.com" text="External" target="_blank" />
    );
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('target')).toBe('_blank');
  });

  it('forwards className to the anchor element', () => {
    const { container } = render(
      <Link href="/" text="Home" className="nav-link" />
    );
    const anchor = container.querySelector('a');
    expect(anchor?.classList.contains('nav-link')).toBe(true);
  });
});
