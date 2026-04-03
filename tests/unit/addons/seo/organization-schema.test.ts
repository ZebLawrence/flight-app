import { describe, it, expect } from 'vitest';
import { generateOrganizationSchema } from '@/lib/addons/seo/index';

describe('SEO addon — Organization schema', () => {
  const config = {
    name: 'Acme Corp',
    url: 'https://acme.example.com',
    logo: 'https://cdn.example.com/logo.png',
  };

  function parseSchema(html: string): Record<string, string> {
    const jsonStr = html
      .replace(/^<script[^>]*>/, '')
      .replace(/<\/script>$/, '');
    return JSON.parse(jsonStr) as Record<string, string>;
  }

  it('Generated JSON-LD has @type: "Organization"', () => {
    const schema = parseSchema(generateOrganizationSchema(config));
    expect(schema['@type']).toBe('Organization');
  });

  it('Contains tenant name', () => {
    const html = generateOrganizationSchema(config);
    expect(html).toContain(config.name);
  });

  it('Contains tenant URL', () => {
    const html = generateOrganizationSchema(config);
    expect(html).toContain(config.url);
  });

  it('Contains logo URL when provided', () => {
    const html = generateOrganizationSchema(config);
    expect(html).toContain(config.logo);
  });

  it('Is valid JSON (parseable without error)', () => {
    const html = generateOrganizationSchema(config);
    const jsonStr = html
      .replace(/^<script[^>]*>/, '')
      .replace(/<\/script>$/, '');
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });
});
