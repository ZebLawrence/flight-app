'use client';

import React from 'react';

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
};

export function Heading({ level = 1, text = '' }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag>{text}</Tag>;
}
