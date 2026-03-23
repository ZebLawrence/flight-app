import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '@/components/cms/content/Icon';

describe('Icon component', () => {
  it('renders an <svg> element for a known icon name', () => {
    const { container } = render(<Icon name="arrow-right" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('applies size to width and height attributes', () => {
    const { container } = render(<Icon name="check" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('unknown icon name renders nothing and does not throw', () => {
    const { container } = render(<Icon name="not-a-real-icon-xyz" />);
    expect(container.firstChild).toBeNull();
  });

  it('forwards className to the svg element', () => {
    const { container } = render(<Icon name="mail" className="my-icon-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('my-icon-class')).toBe(true);
  });
});
