import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { renderComponentTree } from '@/lib/renderer';
import { registry } from '@/components/cms/registry';

// A simple Section component for testing nested trees
const Section = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="section">{children}</div>
);
const testRegistry = { ...registry, Section };

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('renderComponentTree', () => {
  it('renders a single Heading node to correct HTML', () => {
    const node = { type: 'Heading', props: { level: 1, text: 'Hello World' } };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('Hello World');
  });

  it('renders nested tree (Section > Heading + Text) with correct structure', () => {
    const node = {
      type: 'Section',
      props: {},
      children: [
        { type: 'Heading', props: { level: 2, text: 'Title' } },
        { type: 'Text', props: { content: 'Body text' } },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('[data-testid="section"]')).not.toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    expect(container.querySelector('p')?.textContent).toBe('Body text');
  });

  it('skips unknown component types without crashing and returns null', () => {
    const node = { type: 'Unknown', props: {} };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('passes props through to the component', () => {
    const node = { type: 'Heading', props: { level: 3, text: 'Props Test' } };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h3')?.textContent).toBe('Props Test');
  });

  it('handles empty children array', () => {
    const node = { type: 'Section', props: {}, children: [] };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('[data-testid="section"]')).not.toBeNull();
  });

  it('handles node with no props', () => {
    const node = { type: 'Heading' };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('handles deeply nested tree (3+ levels)', () => {
    const node = {
      type: 'Section',
      children: [
        {
          type: 'Section',
          children: [
            { type: 'Heading', props: { level: 1, text: 'Deep' } },
          ],
        },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')?.textContent).toBe('Deep');
  });

  // Malformed JSON resilience
  it('skips node with missing type field and does not crash', () => {
    const node = { props: { text: 'Hi' } };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with type: null', () => {
    const node = { type: null, props: {} };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with type: 123 (number)', () => {
    const node = { type: 123, props: {} };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with props as a string', () => {
    const node = { type: 'Heading', props: 'bad-props' };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with props as an array', () => {
    const node = { type: 'Heading', props: ['a', 'b'] };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with children as a string', () => {
    const node = { type: 'Section', children: 'bad-children' };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips node with children as an object (non-array)', () => {
    const node = { type: 'Section', children: { 0: { type: 'Heading' } } };
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('renders sibling nodes normally when one sibling has malformed structure', () => {
    const node = {
      type: 'Section',
      children: [
        { type: null }, // malformed sibling
        { type: 'Heading', props: { level: 1, text: 'Valid' } },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')?.textContent).toBe('Valid');
  });

  it('renders parent normally when deeply nested child (3+ levels) is malformed', () => {
    const node = {
      type: 'Section',
      children: [
        {
          type: 'Section',
          children: [
            { type: null }, // malformed at depth 3
            { type: 'Text', props: { content: 'Still renders' } },
          ],
        },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('p')?.textContent).toBe('Still renders');
  });

  it('skips completely empty object {} as a node', () => {
    const node = {};
    const element = renderComponentTree(node, testRegistry);
    expect(element).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('handles null in children array without crashing', () => {
    const node = {
      type: 'Section',
      children: [
        null,
        { type: 'Text', props: { content: 'Hello' } },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('p')?.textContent).toBe('Hello');
  });

  it('handles undefined in children array without crashing', () => {
    const node = {
      type: 'Section',
      children: [
        undefined,
        { type: 'Heading', props: { level: 1, text: 'Still renders' } },
      ],
    };
    const element = renderComponentTree(node, testRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')?.textContent).toBe('Still renders');
  });

  // Client component hydration pattern tests
  it('a component with "use client" in the tree renders its SSR initial state without error', () => {
    // Simulates a client component (has "use client" directive in its source file)
    const ClientCounter = ({ label }: { label: string }) => (
      <button data-testid="client-counter">{label}</button>
    );
    const localRegistry = { ...testRegistry, ClientCounter };
    const node = { type: 'ClientCounter', props: { label: 'Click Me' } };
    const element = renderComponentTree(node, localRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('[data-testid="client-counter"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="client-counter"]')?.textContent).toBe('Click Me');
  });

  it('mixed tree with server and client components renders without error', () => {
    // ClientButton simulates a "use client" component; Heading is a server component
    const ClientButton = ({ label }: { label: string }) => (
      <button data-testid="client-button">{label}</button>
    );
    const localRegistry = { ...testRegistry, ClientButton };
    const node = {
      type: 'Section',
      children: [
        { type: 'Heading', props: { level: 1, text: 'Server Heading' } },
        { type: 'ClientButton', props: { label: 'Client Action' } },
      ],
    };
    const element = renderComponentTree(node, localRegistry);
    const { container } = render(<>{element}</>);
    expect(container.querySelector('h1')?.textContent).toBe('Server Heading');
    expect(container.querySelector('[data-testid="client-button"]')?.textContent).toBe('Client Action');
  });
});
