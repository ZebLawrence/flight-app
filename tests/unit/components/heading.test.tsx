import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from '@/components/cms/content/Heading';

describe('Heading component', () => {
  it('renders an <h1> by default when no level is provided', () => {
    const { container } = render(<Heading text="Hello" />);
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('renders correct tag level for level=1', () => {
    const { container } = render(<Heading level={1} text="Title" />);
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('renders correct tag level for level=2', () => {
    const { container } = render(<Heading level={2} text="Title" />);
    expect(container.querySelector('h2')).not.toBeNull();
  });

  it('renders correct tag level for level=3', () => {
    const { container } = render(<Heading level={3} text="Title" />);
    expect(container.querySelector('h3')).not.toBeNull();
  });

  it('renders correct tag level for level=4', () => {
    const { container } = render(<Heading level={4} text="Title" />);
    expect(container.querySelector('h4')).not.toBeNull();
  });

  it('renders correct tag level for level=5', () => {
    const { container } = render(<Heading level={5} text="Title" />);
    expect(container.querySelector('h5')).not.toBeNull();
  });

  it('renders correct tag level for level=6', () => {
    const { container } = render(<Heading level={6} text="Title" />);
    expect(container.querySelector('h6')).not.toBeNull();
  });

  it('renders text prop as text content', () => {
    render(<Heading level={1} text="My Heading Text" />);
    expect(screen.getByText('My Heading Text')).not.toBeNull();
  });

  it('applies text-align style when align prop is provided', () => {
    const { container } = render(<Heading level={1} text="Centered" align="center" />);
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.style.textAlign).toBe('center');
  });

  it('applies text-align left when align="left"', () => {
    const { container } = render(<Heading level={2} text="Left" align="left" />);
    const h2 = container.querySelector('h2');
    expect(h2?.style.textAlign).toBe('left');
  });

  it('applies text-align right when align="right"', () => {
    const { container } = render(<Heading level={3} text="Right" align="right" />);
    const h3 = container.querySelector('h3');
    expect(h3?.style.textAlign).toBe('right');
  });

  it('forwards className to the heading element', () => {
    const { container } = render(<Heading level={1} text="Classed" className="my-custom-class" />);
    const h1 = container.querySelector('h1');
    expect(h1?.classList.contains('my-custom-class')).toBe(true);
  });

  it('applies var(--color-text) as the color style', () => {
    const { container } = render(<Heading level={1} text="Themed" />);
    const h1 = container.querySelector('h1');
    expect(h1?.style.color).toBe('var(--color-text)');
  });
});
