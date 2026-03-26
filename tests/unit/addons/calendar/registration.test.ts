import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentType } from 'react';
import type { AddonModule } from '@/lib/addons/types';

describe('calendar addon registration', () => {
  let registerAddon: (addon: AddonModule) => void;
  let registry: Record<string, ComponentType<any>>;
  let calendarAddon: AddonModule;

  beforeEach(async () => {
    vi.resetModules();
    const registryMod = await import('@/lib/addons/registry');
    registerAddon = registryMod.registerAddon;
    const cmsMod = await import('@/components/cms/registry');
    registry = cmsMod.registry;
    const calendarMod = await import('@/lib/addons/calendar');
    calendarAddon = calendarMod.calendarAddon;
  });

  it('After registration, CalendarWidget component exists in the component registry', () => {
    registerAddon(calendarAddon);
    expect(registry['CalendarWidget']).toBeDefined();
  });
});
