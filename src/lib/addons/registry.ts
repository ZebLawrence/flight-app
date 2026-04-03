import type { AddonModule } from './types';
import { registry } from '@/components/cms/registry';
import { analyticsAddon } from './analytics/index';
import { calendarAddon } from './calendar';
import { formsAddon } from './forms';
import { galleryAddon } from './gallery';
import { seoAddon } from './seo';

const addonStore = new Map<string, AddonModule>();
const componentOwnerMap = new Map<string, string>();

export function registerAddon(addon: AddonModule): void {
  addonStore.set(addon.key, addon);
  if (addon.components) {
    for (const [componentType, component] of Object.entries(addon.components)) {
      registry[componentType] = component;
      componentOwnerMap.set(componentType, addon.key);
    }
  }
}

export function getAddon(key: string): AddonModule | undefined {
  return addonStore.get(key);
}

export function listAddons(): AddonModule[] {
  return Array.from(addonStore.values());
}

export function getComponentAddon(componentType: string): string | null {
  return componentOwnerMap.get(componentType) ?? null;
}

export function registerBuiltinAddons(): void {
  registerAddon(analyticsAddon);
  registerAddon(calendarAddon);
  registerAddon(formsAddon);
  registerAddon(galleryAddon);
  registerAddon(seoAddon);
}
