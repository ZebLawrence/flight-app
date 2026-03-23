import React from 'react';
import { TenantTheme } from '@/lib/types/theme';

const defaults: Required<TenantTheme> = {
  colors: {
    primary: '#2563EB',
    secondary: '#7C3AED',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  logo: '',
  favicon: '',
  borderRadius: '8px',
};

type ThemeProviderProps = {
  theme?: Partial<TenantTheme> | null;
  children?: React.ReactNode;
};

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const colors = { ...defaults.colors, ...theme?.colors };
  const fonts = { ...defaults.fonts, ...theme?.fonts };
  const borderRadius = theme?.borderRadius ?? defaults.borderRadius;

  const css = [
    `--color-primary: ${colors.primary};`,
    `--color-secondary: ${colors.secondary};`,
    `--color-accent: ${colors.accent};`,
    `--color-background: ${colors.background};`,
    `--color-text: ${colors.text};`,
    `--font-heading: '${fonts.heading}', sans-serif;`,
    `--font-body: '${fonts.body}', sans-serif;`,
    `--border-radius: ${borderRadius};`,
  ].join(' ');

  const styleContent = `:root { ${css} }`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      {children}
    </>
  );
}
