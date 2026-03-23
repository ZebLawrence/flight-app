'use client';
import React from 'react';

type ButtonProps = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
};

export function Button({ label, href, variant = 'primary', className }: ButtonProps) {
  const style: React.CSSProperties =
    variant === 'primary'
      ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
      : variant === 'secondary'
      ? { backgroundColor: 'var(--color-secondary)', color: 'var(--color-text)' }
      : { backgroundColor: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' };

  return (
    <a href={href} className={className} style={style}>
      {label}
    </a>
  );
}
