import type { ComponentType } from 'react';
import { Container } from './Container';
import { Section } from './Section';

export const layoutRegistry: Record<string, ComponentType<any>> = {
  Container,
  Section,
};
