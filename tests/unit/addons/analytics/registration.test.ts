import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AddonModule } from '@/lib/addons/types';

describe('analytics addon registration', () => {
  let registerAddon: (addon: AddonModule) => void;
  let getAddon: (key: string) => AddonModule | undefined;
  let analyticsAddon: AddonModule;

  beforeEach(async () => {
    vi.resetModules();
    const registryMod = await import('@/lib/addons/registry');
    registerAddon = registryMod.registerAddon;
    getAddon = registryMod.getAddon;
    const analyticsMod = await import('@/lib/addons/analytics/index');
    analyticsAddon = analyticsMod.analyticsAddon;
  });

  it('After registration, analytics addon exists in the addon registry', () => {
    registerAddon(analyticsAddon);
    expect(getAddon('analytics')).toBeDefined();
  });

  it('Addon has no components (components map is empty or undefined)', () => {
    const components = analyticsAddon.components;
    const isEmpty =
      components === undefined ||
      Object.keys(components).length === 0;
    expect(isEmpty).toBe(true);
  });
});
