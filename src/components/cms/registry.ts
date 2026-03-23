import type { ComponentType } from 'react';
import { contentRegistry } from './content/index';
import { layoutRegistry } from './layout/index';

export const registry: Record<string, ComponentType<any>> = {
  ...layoutRegistry,
  ...contentRegistry,
};
