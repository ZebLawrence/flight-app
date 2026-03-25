import type { ComponentType } from 'react';
import { contentRegistry } from './content/index';
import { layoutRegistry } from './layout/index';
import { interactiveRegistry } from './interactive/index';

export const registry: Record<string, ComponentType<any>> = {
  ...layoutRegistry,
  ...contentRegistry,
  ...interactiveRegistry,
};
