import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from '@/components/cms/content/Text';
import { registry } from '@/components/cms/registry';

describe('Text component', () => {
  it('renders a <p> tag', () => {
    const { container } = render(<Text content="Some text" />);
    expect(container.querySelector('p')).not.toBeNull();
  });

  it('renders content prop as text content', () => {
    render(<Text content="Hello paragraph" />);
    expect(screen.getByText('Hello paragraph')).not.toBeNull();
  });
});

describe('Registry', () => {
  it('registry["Heading"] returns a defined React component', () => {
    expect(registry['Heading']).toBeDefined();
  });

  it('registry["Text"] returns a defined React component', () => {
    expect(registry['Text']).toBeDefined();
  });

  it('unknown key returns undefined', () => {
    expect(registry['Unknown']).toBeUndefined();
  });
});
