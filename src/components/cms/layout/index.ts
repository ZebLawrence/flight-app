import type { ComponentType } from 'react';
import { Container } from './Container';
import { Column } from './Column';
import { Grid } from './Grid';
import { Row } from './Row';
import { Section } from './Section';

export const layoutRegistry: Record<string, ComponentType<any>> = {
  Container,
  Column,
  Grid,
  Row,
  Section,
};
