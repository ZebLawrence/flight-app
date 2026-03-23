import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/cms/content/Button';

describe('Button component', () => {
  it('renders an <a> tag with the correct href attribute', () => {
    const { container } = render(<Button label="Get Started" href="/contact" />);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/contact');
  });

  it('displays the label as text content', () => {
    render(<Button label="Book Now" href="/book" />);
    expect(screen.getByText('Book Now')).not.toBeNull();
  });

  it('variant="primary" applies primary color background styling', () => {
    const { container } = render(<Button label="Primary" href="/" variant="primary" />);
    const anchor = container.querySelector('a');
    expect(anchor?.style.backgroundColor).toBe('var(--color-primary)');
  });

  it('variant="outline" applies transparent background and border', () => {
    const { container } = render(<Button label="Outline" href="/" variant="outline" />);
    const anchor = container.querySelector('a');
    expect(anchor?.style.backgroundColor).toBe('transparent');
    expect(anchor?.style.border).toContain('var(--color-primary)');
  });

  it('forwards className to the anchor element', () => {
    const { container } = render(
      <Button label="Classed" href="/" className="my-custom-class" />
    );
    const anchor = container.querySelector('a');
    expect(anchor?.classList.contains('my-custom-class')).toBe(true);
  });
});
