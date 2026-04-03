import type { AddonModule } from '../types';

export interface SeoAddonConfig {
  name: string;
  url: string;
  logo?: string;
}

/**
 * Generates an Organization JSON-LD script tag for the given tenant config.
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
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * SEO addon — hooks into tenant layout to inject Organization JSON-LD.
 * Registers no visible components.
 */
export const seoAddon: AddonModule = {
  key: 'seo',
  name: 'SEO',
};
