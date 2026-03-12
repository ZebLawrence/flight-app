import type { ComponentType } from 'react';
import { Heading } from './Heading';
import { Text } from './Text';

export const contentRegistry: Record<string, ComponentType<any>> = {
  Heading,
  Text,
};
