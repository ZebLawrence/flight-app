import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Nav } from '@/components/cms/content/Nav';

describe('Nav component', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  it('renders a <nav> element', () => {
    const { container } = render(<Nav items={items} />);
    expect(container.querySelector('nav')).not.toBeNull();
  });

  it('renders nav items as <a> links with correct href and label text', () => {
    const { container } = render(<Nav items={items} />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(items.length);
    items.forEach((item, index) => {
      expect(links[index].getAttribute('href')).toBe(item.href);
      expect(links[index].textContent).toBe(item.label);
    });
  });

  it('renders logo image when logo prop is provided', () => {
    const { container } = render(<Nav items={items} logo="https://example.com/logo.png" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('applies className to the nav wrapper', () => {
    const { container } = render(<Nav items={items} className="site-nav" />);
    const nav = container.querySelector('nav');
    expect(nav?.classList.contains('site-nav')).toBe(true);
  });

  it('empty items array renders nav wrapper with no links', () => {
    const { container } = render(<Nav items={[]} />);
    expect(container.querySelector('nav')).not.toBeNull();
    expect(container.querySelectorAll('a').length).toBe(0);
  });
});
