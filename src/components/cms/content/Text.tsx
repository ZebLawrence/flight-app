'use client';

import React from 'react';

type TextProps = {
  content?: string;
  html?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

export function Text({ content = '', html, className, align }: TextProps) {
  const style: React.CSSProperties = align ? { textAlign: align } : {};

  if (html) {
    // html is expected to be pre-rendered server-side (e.g. from a Markdown pipeline)
    // and must be sanitized by the caller before being passed to this prop.
    return (
      <p
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <p className={className} style={style}>
      {content}
    </p>
  );
}
