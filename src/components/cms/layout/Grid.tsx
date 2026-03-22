'use client';

import React from 'react';

interface GridProps {
  columns?: number | string;
  gap?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Grid({ columns = 1, gap, className, children }: GridProps) {
  const gridTemplateColumns =
    typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns;

  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns,
    ...(gap ? { gap } : {}),
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
