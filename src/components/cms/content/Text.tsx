'use client';

import React from 'react';

type TextProps = {
  content?: string;
};

export function Text({ content = '' }: TextProps) {
  return <p>{content}</p>;
}
