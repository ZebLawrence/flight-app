import { describe, it, expect } from 'vitest';
import { generateOrganizationSchema } from '@/lib/addons/seo/index';

describe('SEO addon — Organization schema', () => {
  const config = {
    name: 'Acme Corp',
    url: 'https://acme.example.com',
    logo: 'https://cdn.example.com/logo.png',
  };

  it('Generated JSON-LD has @type: "Organization"', () => {
    const schema = JSON.parse(generateOrganizationSchema(config)) as Record<string, string>;
    expect(schema['@type']).toBe('Organization');
  });

  it('Contains tenant name', () => {
    const jsonStr = generateOrganizationSchema(config);
    expect(jsonStr).toContain(config.name);
  });

  it('Contains tenant URL', () => {
    const jsonStr = generateOrganizationSchema(config);
    expect(jsonStr).toContain(config.url);
  });

  it('Contains logo URL when provided', () => {
    const jsonStr = generateOrganizationSchema(config);
    expect(jsonStr).toContain(config.logo);
  });

  it('Is valid JSON (parseable without error)', () => {
    const jsonStr = generateOrganizationSchema(config);
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });
});
