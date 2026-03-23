import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Header } from '@/components/cms/content/Header';

describe('Header component', () => {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
  ];

  it('renders a <header> element', () => {
    const { container } = render(<Header />);
    expect(container.querySelector('header')).not.toBeNull();
  });

  it('renders logo image when logo prop is provided', () => {
    const { container } = render(<Header logo="https://example.com/logo.png" />);
    const img = container.querySelector('header > img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('renders Nav component with provided nav items', () => {
    const { container } = render(<Header navItems={navItems} />);
    const links = container.querySelectorAll('nav a');
    expect(links.length).toBe(navItems.length);
    navItems.forEach((item, index) => {
      expect(links[index].getAttribute('href')).toBe(item.href);
      expect(links[index].textContent).toBe(item.label);
    });
  });

  it('renders CTA button as <a> when cta prop is provided', () => {
    const { container } = render(
      <Header cta={{ label: 'Contact Us', href: '/contact', variant: 'primary' }} />
    );
    const anchor = container.querySelector('a[href="/contact"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe('Contact Us');
  });

  it('does not render CTA when cta prop is omitted', () => {
    const { container } = render(<Header navItems={navItems} />);
    expect(container.querySelector('a[href]')).not.toBeNull(); // nav links exist
    // No standalone CTA anchor outside the nav
    const allAnchors = container.querySelectorAll('a');
    expect(allAnchors.length).toBe(navItems.length);
  });

  it('sticky=true applies sticky positioning style', () => {
    const { container } = render(<Header sticky={true} />);
    const header = container.querySelector('header');
    expect(header?.style.position).toBe('sticky');
  });

  it('renders children inside the header', () => {
    const { container } = render(
      <Header>
        <span id="custom-child">Custom Content</span>
      </Header>
    );
    expect(container.querySelector('#custom-child')).not.toBeNull();
    expect(container.querySelector('header #custom-child')).not.toBeNull();
  });
});
