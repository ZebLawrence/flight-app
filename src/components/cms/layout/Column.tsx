'use client';

import React from 'react';

interface ColumnProps {
  span?: number | string;
  className?: string;
  children?: React.ReactNode;
}

export function Column({ span, className, children }: ColumnProps) {
  const style: React.CSSProperties = {};

  if (span !== undefined) {
    if (typeof span === 'number') {
      style.flexGrow = span;
    } else {
      style.gridColumn = span;
    }
  }

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
