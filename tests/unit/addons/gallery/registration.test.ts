import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentType } from 'react';
import type { AddonModule } from '@/lib/addons/types';

describe('gallery addon registration', () => {
  let registerAddon: (addon: AddonModule) => void;
  let registry: Record<string, ComponentType<any>>;
  let galleryAddon: AddonModule;

  beforeEach(async () => {
    vi.resetModules();
    const registryMod = await import('@/lib/addons/registry');
    registerAddon = registryMod.registerAddon;
    const cmsMod = await import('@/components/cms/registry');
    registry = cmsMod.registry;
    const galleryMod = await import('@/lib/addons/gallery');
    galleryAddon = galleryMod.galleryAddon;
  });

  it('After registration, Gallery component exists in component registry', () => {
    registerAddon(galleryAddon);
    expect(registry['Gallery']).toBeDefined();
  });

  it('After registration, Lightbox component exists in component registry', () => {
    registerAddon(galleryAddon);
    expect(registry['Lightbox']).toBeDefined();
  });
});
