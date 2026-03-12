'use client';

import React from 'react';

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
  children?: React.ReactNode;
};

export function Heading({ level = 1, text = '', children }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <>
      <Tag>{text}</Tag>
      {children}
    </>
  );
}
