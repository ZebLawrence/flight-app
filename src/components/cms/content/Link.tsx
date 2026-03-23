'use client';
import React from 'react';

type LinkProps = {
  href: string;
  text: string;
  className?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
};

export function Link({ href, text, className, target }: LinkProps) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      {text}
    </a>
  );
}
