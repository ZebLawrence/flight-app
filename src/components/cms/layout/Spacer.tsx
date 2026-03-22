'use client';

import React from 'react';

interface SpacerProps {
  height?: string;
  width?: string;
}

export function Spacer({ height, width }: SpacerProps) {
  const style: React.CSSProperties = {
    ...(height ? { height } : {}),
    ...(width ? { width } : {}),
  };

  return <div style={style} />;
}
