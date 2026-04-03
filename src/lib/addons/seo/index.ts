import type { AddonModule } from '../types';

export interface SeoAddonConfig {
  name: string;
  url: string;
  logo?: string;
}

/**
 * Generates the Organization JSON-LD content for the given tenant config.
 * Returns a JSON string (without wrapping script tags) ready to pass to
 * dangerouslySetInnerHTML or similar APIs.
 * The logo property is omitted when not provided.
 */
export function generateOrganizationSchema(config: SeoAddonConfig): string {
  const schema: Record<string, string> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
  };
  if (config.logo) {
    schema.logo = config.logo;
  }
  return JSON.stringify(schema);
}

/**
 * SEO addon — hooks into tenant layout to inject Organization JSON-LD.
 * Registers no visible components.
 */
export const seoAddon: AddonModule = {
  key: 'seo',
  name: 'SEO',
};
