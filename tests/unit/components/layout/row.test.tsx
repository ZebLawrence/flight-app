import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Row } from '@/components/cms/layout/Row';

describe('Row component', () => {
  it('renders with display: flex and flex-direction: row', () => {
    const { container } = render(<Row />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.display).toBe('flex');
    expect(el.style.flexDirection).toBe('row');
  });

  it('applies gap prop as CSS gap', () => {
    const { container } = render(<Row gap="1rem" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.gap).toBe('1rem');
  });

  it('applies align-items from align prop', () => {
    const { container } = render(<Row align="center" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.alignItems).toBe('center');
  });

  it('applies justify-content from justify prop', () => {
    const { container } = render(<Row justify="space-between" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.justifyContent).toBe('space-between');
  });

  it('passes className to the wrapper element', () => {
    const { container } = render(<Row className="my-row" />);
    const el = container.querySelector('div');
    expect(el?.classList.contains('my-row')).toBe(true);
  });

  it('renders children inside the wrapper', () => {
    render(<Row><span>Row Child</span></Row>);
    expect(screen.getByText('Row Child')).not.toBeNull();
  });
});
