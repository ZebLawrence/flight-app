import { describe, expect, it } from 'vitest';
import { markdownToHtml } from '@/lib/markdown';

describe('markdownToHtml', () => {
  it('converts heading to <h1>', async () => {
    const result = await markdownToHtml('# Heading');
    expect(result).toContain('<h1>Heading</h1>');
  });

  it('converts bold to <strong>', async () => {
    const result = await markdownToHtml('**bold**');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('converts fenced code block to <pre><code>', async () => {
    const result = await markdownToHtml('```\nconsole.log("hi");\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('converts link to <a href>', async () => {
    const result = await markdownToHtml('[link](https://example.com)');
    expect(result).toContain('<a href="https://example.com">link</a>');
  });

  it('converts GFM table to <table>', async () => {
    const table = '| A | B |\n|---|---|\n| 1 | 2 |';
    const result = await markdownToHtml(table);
    expect(result).toContain('<table>');
  });

  it('converts list to <ul><li>', async () => {
    const result = await markdownToHtml('- item');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('returns empty string for empty input', async () => {
    const result = await markdownToHtml('');
    expect(result).toBe('');
  });

  it('wraps plain text in <p>', async () => {
    const result = await markdownToHtml('plain text');
    expect(result).toContain('<p>');
    expect(result).toContain('plain text');
  });
});
