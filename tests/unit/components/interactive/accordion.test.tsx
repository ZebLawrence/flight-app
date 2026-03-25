import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Accordion } from '@/components/cms/interactive/Accordion';

afterEach(cleanup);

const items = [
  { title: 'First Item', content: 'First content' },
  { title: 'Second Item', content: 'Second content' },
];

describe('Accordion component', () => {
  it('renders all item titles', () => {
    render(<Accordion items={items} allowMultiple={false} />);
    expect(screen.getByText('First Item')).not.toBeNull();
    expect(screen.getByText('Second Item')).not.toBeNull();
  });

  it('all items start collapsed on initial render', () => {
    const { container } = render(<Accordion items={items} allowMultiple={false} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('item content is present in DOM but hidden', () => {
    const { container } = render(<Accordion items={items} allowMultiple={false} />);
    const hiddenDivs = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenDivs.length).toBe(2);
    expect(hiddenDivs[0].textContent).toBe('First content');
    expect(hiddenDivs[1].textContent).toBe('Second content');
  });
});
