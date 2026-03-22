'use client';

import React from 'react';

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
};

export function Heading({ level = 1, text = '', className, align, children }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const style: React.CSSProperties = {
    color: 'var(--color-text)',
    ...(align ? { textAlign: align } : {}),
  };
  return (
    <>
      <Tag className={className} style={style}>{text}</Tag>
      {children}
    </>
  );
}
