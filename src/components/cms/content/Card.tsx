'use client';

import React from 'react';

type CardProps = {
  title?: string;
  image?: string;
  className?: string;
  children?: React.ReactNode;
};

export function Card({ title, image, className, children }: CardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={title ?? 'Card image'} style={{ width: '100%', display: 'block' }} />
      )}
      <div style={{ padding: '1rem' }}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
