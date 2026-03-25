import { describe, expect, it } from 'vitest';
import type { AddonModule, JSONSchema, RouteHandler } from '@/lib/addons/types';
import type { ComponentType } from 'react';

describe('AddonModule interface', () => {
  it('accepts a minimal addon with only required fields', () => {
    const addon: AddonModule = {
      key: 'analytics',
      name: 'Analytics',
    };
    expect(addon.key).toBe('analytics');
    expect(addon.name).toBe('Analytics');
    expect(addon.components).toBeUndefined();
    expect(addon.apiRoutes).toBeUndefined();
    expect(addon.configSchema).toBeUndefined();
  });

  it('accepts a full addon with all optional fields populated', () => {
    const MockComponent: ComponentType<any> = () => null;
    const handler: RouteHandler = (_req) =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        provider: { type: 'string' },
      },
      required: ['provider'],
    };

    const addon: AddonModule = {
      key: 'analytics',
      name: 'Analytics',
      components: { Widget: MockComponent },
      apiRoutes: { '/api/analytics': handler },
      configSchema: schema,
    };

    expect(addon.key).toBe('analytics');
    expect(addon.name).toBe('Analytics');
    expect(addon.components).toHaveProperty('Widget');
    expect(addon.apiRoutes).toHaveProperty('/api/analytics');
    expect(addon.configSchema?.type).toBe('object');
    expect(addon.configSchema?.required).toContain('provider');
  });

  it('JSONSchema allows nested properties', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
      },
    };
    expect(schema.properties?.['nested']?.type).toBe('object');
    expect(schema.properties?.['nested']?.properties?.['value']?.type).toBe('string');
  });
});
