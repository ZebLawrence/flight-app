'use client';

import React from 'react';
import NextImage from 'next/image';

type ImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
};

export function Image({ src, alt, width, height, className, objectFit }: ImageProps) {
  const style: React.CSSProperties = objectFit ? { objectFit } : {};
  if (width !== undefined && height !== undefined) {
    return (
      <NextImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }
  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      className={className}
      style={style}
    />
  );
}
