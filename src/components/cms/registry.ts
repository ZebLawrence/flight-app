import type { ComponentType } from 'react';
import { contentRegistry } from './content/index';

export const registry: Record<string, ComponentType<any>> = {
  ...contentRegistry,
};
