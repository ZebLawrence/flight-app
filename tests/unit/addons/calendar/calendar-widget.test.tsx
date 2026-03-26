import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalendarWidget } from '@/lib/addons/calendar/components/CalendarWidget';

afterEach(cleanup);

describe('CalendarWidget component', () => {
  // Test 1: Renders title and description text
  it('renders title and description text', () => {
    render(
      <CalendarWidget
        bookingUrl="https://example.com/book"
        title="Book a Flight"
        description="Reserve your seat today."
      />,
    );
    expect(screen.getByText('Book a Flight')).not.toBeNull();
    expect(screen.getByText('Reserve your seat today.')).not.toBeNull();
  });

  // Test 2: Renders an <iframe> with the bookingUrl
  it('renders an iframe with the bookingUrl', () => {
    const { container } = render(
      <CalendarWidget
        bookingUrl="https://example.com/book"
        title="Book a Flight"
        description="Reserve your seat today."
      />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute('src', 'https://example.com/book');
  });

  // Test 3: Missing bookingUrl renders a fallback or nothing (no crash)
  it('missing bookingUrl renders nothing without crashing', () => {
    const { container } = render(
      <CalendarWidget
        bookingUrl=""
        title="Book a Flight"
        description="Reserve your seat today."
      />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeNull();
    expect(screen.getByText('Book a Flight')).not.toBeNull();
  });
});
