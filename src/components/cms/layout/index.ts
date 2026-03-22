import type { ComponentType } from 'react';
import { Container } from './Container';
import { Grid } from './Grid';
import { Section } from './Section';

export const layoutRegistry: Record<string, ComponentType<any>> = {
  Container,
  Grid,
  Section,
};
