import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { List } from '@/components/cms/content/List';

describe('List component', () => {
  const items = ['Feature one', 'Feature two', 'Feature three'];

  it('renders a <ul> when ordered is false or omitted', () => {
    const { container } = render(<List items={items} />);
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('ol')).toBeNull();
  });

  it('renders a <ol> when ordered is true', () => {
    const { container } = render(<List items={items} ordered={true} />);
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('renders the correct number of <li> elements matching items array length', () => {
    const { container } = render(<List items={items} />);
    const liElements = container.querySelectorAll('li');
    expect(liElements.length).toBe(items.length);
  });

  it('renders each item as an <li> with correct text content', () => {
    const { container } = render(<List items={items} />);
    const liElements = container.querySelectorAll('li');
    items.forEach((item, index) => {
      expect(liElements[index].textContent).toBe(item);
    });
  });

  it('forwards className to the list element', () => {
    const { container } = render(<List items={items} className="my-list" />);
    const list = container.querySelector('ul');
    expect(list?.classList.contains('my-list')).toBe(true);
  });
});
