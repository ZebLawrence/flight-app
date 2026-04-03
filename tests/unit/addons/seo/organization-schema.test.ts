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
    const schema = JSON.parse(generateOrganizationSchema(config)) as Record<string, string>;
    expect(schema.name).toBe(config.name);
  });

  it('Contains tenant URL', () => {
    const schema = JSON.parse(generateOrganizationSchema(config)) as Record<string, string>;
    expect(schema.url).toBe(config.url);
  });

  it('Contains logo URL when provided', () => {
    const schema = JSON.parse(generateOrganizationSchema(config)) as Record<string, string>;
    expect(schema.logo).toBe(config.logo);
  });

  it('Is valid JSON (parseable without error)', () => {
    const jsonStr = generateOrganizationSchema(config);
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });

  it('Omits logo property when logo is not provided', () => {
    const { logo: _logo, ...configWithoutLogo } = config;
    const schema = JSON.parse(generateOrganizationSchema(configWithoutLogo)) as Record<string, unknown>;
    expect('logo' in schema).toBe(false);
  });
});
