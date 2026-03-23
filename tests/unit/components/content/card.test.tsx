import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/cms/content/Card';

describe('Card component', () => {
  it('renders a wrapper element with card styling (shadow, border, or background)', () => {
    const { container } = render(<Card />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    const style = wrapper.getAttribute('style') ?? '';
    const hasStyling =
      style.includes('box-shadow') ||
      style.includes('border') ||
      style.includes('background');
    expect(hasStyling).toBe(true);
  });

  it('renders title as a heading element inside the card when provided', () => {
    render(<Card title="Our Service" />);
    const heading = screen.getByRole('heading', { name: 'Our Service' });
    expect(heading).not.toBeNull();
  });

  it('renders image as an image element at the top of the card when provided', () => {
    const { container } = render(
      <Card image="https://example.com/service.jpg" title="Service" />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/service.jpg');
  });

  it('renders children inside the card body', () => {
    render(
      <Card>
        <p>Description here</p>
      </Card>
    );
    expect(screen.getByText('Description here')).not.toBeNull();
  });
});
