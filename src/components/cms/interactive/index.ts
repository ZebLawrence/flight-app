import type { ComponentType } from 'react';
import { Accordion } from './Accordion';
import { Carousel } from './Carousel';
import { Tabs } from './Tabs';

// Interactive components use the "use client" directive for client-side interactivity.
// Register new interactive components here so the CMS renderer can resolve them by type name.
export const interactiveRegistry: Record<string, ComponentType<any>> = {
  Accordion,
  Carousel,
  Tabs,
};
