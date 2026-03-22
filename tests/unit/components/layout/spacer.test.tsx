import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spacer } from '@/components/cms/layout/Spacer';

describe('Spacer component', () => {
  it('renders empty div with specified height applied in style', () => {
    const { container } = render(<Spacer height="2rem" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.height).toBe('2rem');
  });

  it('renders empty div with specified width applied in style', () => {
    const { container } = render(<Spacer width="1rem" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.width).toBe('1rem');
  });

  it('renders with default/zero dimensions when no props given (does not crash)', () => {
    const { container } = render(<Spacer />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.height).toBe('');
    expect(el.style.width).toBe('');
  });
});
