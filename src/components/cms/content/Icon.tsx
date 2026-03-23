'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

type IconProps = {
  name: string;
  size?: number;
  className?: string;
};

function toComponentName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function Icon({ name, size = 24, className }: IconProps) {
  const componentName = toComponentName(name);
  const LucideIcon = (LucideIcons as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>>)[componentName];

  if (!LucideIcon) {
    return null;
  }

  return <LucideIcon size={size} className={className} />;
}
