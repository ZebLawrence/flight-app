import type { AddonModule } from '../types';

export interface SeoAddonConfig {
  name: string;
  url: string;
  logo?: string;
}

export interface ArticleSchemaConfig {
  title: string;
  author: string;
  publishedAt?: Date | null;
  excerpt?: string | null;
  featuredImage?: string | null;
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
 * Generates the Article JSON-LD content for a blog post.
 * Returns a JSON string (without wrapping script tags) ready to pass to
 * dangerouslySetInnerHTML or similar APIs.
 * Optional fields (datePublished, description, image) are omitted when not provided.
 */
export function generateArticleSchema(config: ArticleSchemaConfig): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    author: { '@type': 'Person', name: config.author },
  };
  if (config.publishedAt) {
    schema.datePublished = config.publishedAt.toISOString();
  }
  if (config.excerpt) {
    schema.description = config.excerpt;
  }
  if (config.featuredImage) {
    schema.image = config.featuredImage;
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
