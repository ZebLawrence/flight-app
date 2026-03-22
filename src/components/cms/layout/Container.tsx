'use client';

import React from 'react';

interface ContainerProps {
  maxWidth?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Container({ maxWidth = '1200px', className, children }: ContainerProps) {
  const style: React.CSSProperties = {
    maxWidth,
    margin: '0 auto',
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
