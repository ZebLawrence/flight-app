import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Column } from '@/components/cms/layout/Column';

describe('Column component', () => {
  it('renders children correctly', () => {
    render(<Column><span>Column Child</span></Column>);
    expect(screen.getByText('Column Child')).not.toBeNull();
  });

  it('applies numeric span as flex style', () => {
    const { container } = render(<Column span={2} />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.flexGrow).toBe('2');
  });

  it('applies string span as grid-column style', () => {
    const { container } = render(<Column span="1 / 3" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.gridColumn).toBe('1 / 3');
  });

  it('passes className to the wrapper element', () => {
    const { container } = render(<Column className="my-col" />);
    const el = container.querySelector('div');
    expect(el?.classList.contains('my-col')).toBe(true);
  });

  it('renders without span prop without error', () => {
    const { container } = render(<Column />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.flexGrow).toBe('');
    expect(el.style.gridColumn).toBe('');
  });
});
