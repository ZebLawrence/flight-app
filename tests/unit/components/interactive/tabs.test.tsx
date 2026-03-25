import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Tabs } from '@/components/cms/interactive/Tabs';

afterEach(cleanup);

const tabs = [
  { label: 'Tab One', content: 'Content for tab one' },
  { label: 'Tab Two', content: 'Content for tab two' },
  { label: 'Tab Three', content: 'Content for tab three' },
];

describe('Tabs component', () => {
  it('renders all tab labels as clickable elements', () => {
    render(<Tabs tabs={tabs} defaultTab={0} />);
    expect(screen.getByText('Tab One')).not.toBeNull();
    expect(screen.getByText('Tab Two')).not.toBeNull();
    expect(screen.getByText('Tab Three')).not.toBeNull();
  });

  it('first tab (or defaultTab) content is visible on initial render', () => {
    const { container } = render(<Tabs tabs={tabs} defaultTab={0} />);
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels[0].getAttribute('aria-hidden')).toBe('false');
    expect(panels[0].getAttribute('style')).toBeNull();
  });

  it('other tab content is hidden on initial render', () => {
    const { container } = render(<Tabs tabs={tabs} defaultTab={0} />);
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels[1].getAttribute('aria-hidden')).toBe('true');
    expect(panels[2].getAttribute('aria-hidden')).toBe('true');
  });
});
