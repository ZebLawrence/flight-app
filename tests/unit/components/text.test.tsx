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

  it('applies text alignment via style when align is provided', () => {
    const { container } = render(<Text content="Centered" align="center" />);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p!.style.textAlign).toBe('center');
  });

  it('renders html prop via dangerouslySetInnerHTML', () => {
    const { container } = render(<Text html="<strong>Bold</strong>" />);
    expect(container.querySelector('strong')).not.toBeNull();
  });

  it('ignores content prop when html is provided', () => {
    const { container } = render(<Text html="<em>HTML</em>" content="plain text" />);
    expect(screen.queryByText('plain text')).toBeNull();
    expect(container.querySelector('em')).not.toBeNull();
  });

  it('passes className through to the root element', () => {
    const { container } = render(<Text content="Styled" className="my-class" />);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p!.classList.contains('my-class')).toBe(true);
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
