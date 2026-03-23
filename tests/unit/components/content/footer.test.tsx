import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/cms/content/Footer';

describe('Footer component', () => {
  const columns = [
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Support',
      links: [{ label: 'FAQ', href: '/faq' }],
    },
  ];

  it('renders a <footer> element', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('renders link columns with column titles and link items', () => {
    const { container } = render(<Footer columns={columns} />);
    expect(screen.getByText('Company')).not.toBeNull();
    expect(screen.getByText('Support')).not.toBeNull();
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toBe('/about');
    expect(links[0].textContent).toBe('About');
    expect(links[1].getAttribute('href')).toBe('/contact');
    expect(links[1].textContent).toBe('Contact');
    expect(links[2].getAttribute('href')).toBe('/faq');
    expect(links[2].textContent).toBe('FAQ');
  });

  it('renders copyright text when copyright prop is provided', () => {
    render(<Footer copyright="© 2025 Acme Corp. All rights reserved." />);
    expect(screen.getByText('© 2025 Acme Corp. All rights reserved.')).not.toBeNull();
  });

  it('renders social links as icon <a> elements when socialLinks provided', () => {
    const socialLinks = [
      { icon: 'twitter', href: 'https://twitter.com/acme' },
      { icon: 'github', href: 'https://github.com/acme' },
    ];
    const { container } = render(<Footer socialLinks={socialLinks} />);
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBe(2);
    expect(anchors[0].getAttribute('href')).toBe('https://twitter.com/acme');
    expect(anchors[1].getAttribute('href')).toBe('https://github.com/acme');
  });

  it('renders children inside the footer', () => {
    const { container } = render(
      <Footer>
        <span id="custom-child">Custom Footer Content</span>
      </Footer>
    );
    expect(container.querySelector('#custom-child')).not.toBeNull();
    expect(container.querySelector('footer #custom-child')).not.toBeNull();
  });
});
