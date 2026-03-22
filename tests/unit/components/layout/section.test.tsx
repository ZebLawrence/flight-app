import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from '@/components/cms/layout/Section';

describe('Section component', () => {
  it('renders a <section> wrapper element', () => {
    const { container } = render(<Section />);
    expect(container.querySelector('section')).not.toBeNull();
  });

  it('applies background prop as inline style', () => {
    const { container } = render(<Section background="#F9FAFB" />);
    const el = container.querySelector('section') as HTMLElement;
    expect(el.getAttribute('style')).toContain('background');
    expect(el.style.background).not.toBe('');
  });

  it('applies padding prop as inline style', () => {
    const { container } = render(<Section padding="4rem 0" />);
    const el = container.querySelector('section') as HTMLElement;
    expect(el.getAttribute('style')).toContain('padding');
    expect(el.style.padding).not.toBe('');
  });

  it('passes className to the wrapper element', () => {
    const { container } = render(<Section className="hero" />);
    const el = container.querySelector('section');
    expect(el?.classList.contains('hero')).toBe(true);
  });

  it('renders children inside the wrapper', () => {
    render(<Section><span>Hello World</span></Section>);
    expect(screen.getByText('Hello World')).not.toBeNull();
  });
});
