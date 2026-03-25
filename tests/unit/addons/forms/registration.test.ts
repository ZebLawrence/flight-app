import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentType } from 'react';
import type { AddonModule } from '@/lib/addons/types';

describe('forms addon registration', () => {
  let registerAddon: (addon: AddonModule) => void;
  let registry: Record<string, ComponentType<any>>;
  let formsAddon: AddonModule;

  beforeEach(async () => {
    vi.resetModules();
    const registryMod = await import('@/lib/addons/registry');
    registerAddon = registryMod.registerAddon;
    const cmsMod = await import('@/components/cms/registry');
    registry = cmsMod.registry;
    const formsMod = await import('@/lib/addons/forms');
    formsAddon = formsMod.formsAddon;
  });

  it('After registration, FormBuilder component exists in the component registry', () => {
    registerAddon(formsAddon);
    expect(registry['FormBuilder']).toBeDefined();
  });

  it('Addon metadata has correct key ("forms") and name', () => {
    expect(formsAddon.key).toBe('forms');
    expect(formsAddon.name).toBe('Forms');
  });
});
