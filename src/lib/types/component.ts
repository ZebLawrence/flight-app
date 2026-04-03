import React from 'react';

export type ComponentNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: ComponentNode[];
};

export interface PageMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;      // URL to OG image
  ogType?: 'website' | 'article' | 'book' | 'profile';
  canonicalUrl?: string;
}

// Layout component props

export interface SectionProps {
  className?: string;
  background?: string;
  padding?: string;
  children?: React.ReactNode;
}

export interface ContainerProps {
  maxWidth?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface GridProps {
  columns?: number | string;
  gap?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface RowProps {
  gap?: string;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  className?: string;
  children?: React.ReactNode;
}

export interface ColumnProps {
  span?: number | string;
  className?: string;
  children?: React.ReactNode;
}

export interface SpacerProps {
  height?: string | number;
  width?: string | number;
}

// Content component props

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface TextProps {
  content?: string;
  html?: string;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface ImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export interface ButtonProps {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export interface LinkProps {
  href: string;
  text: string;
  className?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
}

export interface IconProps {
  name: string;
  size?: number | string;
  className?: string;
}

export interface ListProps {
  items: string[];
  ordered?: boolean;
  className?: string;
}

export interface CardProps {
  title?: string;
  image?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface NavProps {
  items?: Array<{ label: string; href: string }>;
  logo?: string;
  className?: string;
}

export interface HeaderProps {
  logo?: string;
  navItems?: Array<{ label: string; href: string }>;
  cta?: { label: string; href: string; variant?: 'primary' | 'secondary' | 'outline' };
  sticky?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface FooterProps {
  columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  copyright?: string;
  socialLinks?: Array<{ icon: string; href: string }>;
  className?: string;
  children?: React.ReactNode;
}
