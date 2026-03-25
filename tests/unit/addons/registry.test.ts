import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentType } from 'react';
import type { AddonModule } from '@/lib/addons/types';

describe('addon registry', () => {
  let registerAddon: (addon: AddonModule) => void;
  let getAddon: (key: string) => AddonModule | undefined;
  let listAddons: () => AddonModule[];
  let getComponentAddon: (componentType: string) => string | null;
  let registry: Record<string, ComponentType<any>>;

  beforeEach(async () => {
    vi.resetModules();
    const registryMod = await import('@/lib/addons/registry');
    registerAddon = registryMod.registerAddon;
    getAddon = registryMod.getAddon;
    listAddons = registryMod.listAddons;
    getComponentAddon = registryMod.getComponentAddon;
    const cmsMod = await import('@/components/cms/registry');
    registry = cmsMod.registry;
  });

  const MockWidget: ComponentType<any> = () => null;

  const analyticsAddon: AddonModule = {
    key: 'analytics',
    name: 'Analytics',
    components: { AnalyticsWidget: MockWidget },
  };

  it('registerAddon adds the addon to the registry', () => {
    registerAddon(analyticsAddon);
    expect(getAddon('analytics')).toBe(analyticsAddon);
  });

  it("registered addon's components appear in the main component registry", () => {
    registerAddon(analyticsAddon);
    expect(registry['AnalyticsWidget']).toBe(MockWidget);
  });

  it('getAddon(key) returns the registered addon', () => {
    registerAddon(analyticsAddon);
    expect(getAddon('analytics')).toEqual(analyticsAddon);
  });

  it('getAddon(unknownKey) returns undefined', () => {
    expect(getAddon('nonexistent')).toBeUndefined();
  });

  it('listAddons returns all registered addons', () => {
    const MockChart: ComponentType<any> = () => null;
    const chartsAddon: AddonModule = {
      key: 'charts',
      name: 'Charts',
      components: { ChartWidget: MockChart },
    };
    registerAddon(analyticsAddon);
    registerAddon(chartsAddon);
    const addons = listAddons();
    expect(addons).toHaveLength(2);
    expect(addons).toContain(analyticsAddon);
    expect(addons).toContain(chartsAddon);
  });

  it('getComponentAddon returns addon key for addon component and null for core components', () => {
    registerAddon(analyticsAddon);
    expect(getComponentAddon('AnalyticsWidget')).toBe('analytics');
    expect(getComponentAddon('Button')).toBeNull();
  });
});
