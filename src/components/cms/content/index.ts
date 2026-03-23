import type { ComponentType } from 'react';
import { Heading } from './Heading';
import { Text } from './Text';
import { Image } from './Image';

export const contentRegistry: Record<string, ComponentType<any>> = {
  Heading,
  Text,
  Image,
};
