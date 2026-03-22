'use client';

import React from 'react';

interface SectionProps {
  background?: string;
  padding?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Section({ background, padding, className, children }: SectionProps) {
  const style: React.CSSProperties = {};
  if (background !== undefined) style.background = background;
  if (padding !== undefined) style.padding = padding;

  return (
    <section style={style} className={className}>
      {children}
    </section>
  );
}
