import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '@/components/cms/layout/Grid';

describe('Grid component', () => {
  it('renders with display: grid style', () => {
    const { container } = render(<Grid />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.display).toBe('grid');
  });

  it('applies columns prop to grid-template-columns (number)', () => {
    const { container } = render(<Grid columns={3} />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  it('applies columns prop to grid-template-columns (string)', () => {
    const { container } = render(<Grid columns="1fr 2fr 1fr" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.gridTemplateColumns).toBe('1fr 2fr 1fr');
  });

  it('applies gap prop to the grid gap', () => {
    const { container } = render(<Grid gap="2rem" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.gap).toBe('2rem');
  });

  it('renders children as grid items', () => {
    render(
      <Grid>
        <span>Item One</span>
        <span>Item Two</span>
      </Grid>
    );
    expect(screen.getByText('Item One')).not.toBeNull();
    expect(screen.getByText('Item Two')).not.toBeNull();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<Grid className="my-grid" />);
    const el = container.querySelector('div') as HTMLElement;
    expect(el.className).toBe('my-grid');
  });
});
