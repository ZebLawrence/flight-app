'use client';

import React from 'react';

interface RowProps {
  gap?: string;
  align?: string;
  justify?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Row({ gap, align, justify, className, children }: RowProps) {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    ...(gap ? { gap } : {}),
    ...(align ? { alignItems: align } : {}),
    ...(justify ? { justifyContent: justify } : {}),
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
