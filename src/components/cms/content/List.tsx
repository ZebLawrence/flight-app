'use client';

import React from 'react';

interface ListProps {
  items: string[];
  ordered?: boolean;
  className?: string;
}

export function List({ items, ordered = false, className }: ListProps) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={className}>
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </Tag>
  );
}
