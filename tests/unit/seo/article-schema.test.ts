import { describe, it, expect } from 'vitest';
import { generateArticleSchema } from '@/lib/addons/seo/index';

describe('SEO addon — Article schema', () => {
  const post = {
    title: 'Hello World',
    author: 'Jane Doe',
    publishedAt: new Date('2024-06-01T12:00:00.000Z'),
    excerpt: 'A brief introduction to the topic.',
    featuredImage: 'https://cdn.example.com/hero.jpg',
  };

  it('Generated JSON-LD has @type: "Article"', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema['@type']).toBe('Article');
  });

  it('Contains headline matching post title', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema.headline).toBe(post.title);
  });

  it('Contains author matching post author', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema.author).toEqual({ '@type': 'Person', name: post.author });
  });

  it('Contains datePublished matching post published date', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema.datePublished).toBe(post.publishedAt.toISOString());
  });

  it('Contains description matching post excerpt', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema.description).toBe(post.excerpt);
  });

  it('Contains image when featured image is set', () => {
    const schema = JSON.parse(generateArticleSchema(post)) as Record<string, unknown>;
    expect(schema.image).toBe(post.featuredImage);
  });
});
