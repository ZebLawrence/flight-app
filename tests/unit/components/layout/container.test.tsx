import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from '@/components/cms/layout/Container';

describe('Container component', () => {
  it('renders with max-width style applied', () => {
    const { container } = render(<Container maxWidth="800px" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.maxWidth).toBe('800px');
  });

  it('centers content with margin: 0 auto', () => {
    const { container } = render(<Container />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.margin).toBe('0px auto');
  });

  it('renders children correctly', () => {
    render(<Container><span>Hello World</span></Container>);
    expect(screen.getByText('Hello World')).not.toBeNull();
  });
});
