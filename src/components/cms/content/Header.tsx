'use client';

import React from 'react';
import { Nav } from './Nav';
import { Button } from './Button';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface HeaderProps {
  logo?: string;
  navItems?: Array<{ label: string; href: string }>;
  cta?: { label: string; href: string; variant?: ButtonVariant };
  sticky?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Header({ logo, navItems, cta, sticky = false, className, children }: HeaderProps) {
  const style: React.CSSProperties = sticky
    ? { position: 'sticky', top: 0, zIndex: 100 }
    : {};

  return (
    <header className={className} style={style}>
      {logo && <img src={logo} alt="Logo" />}
      {navItems && <Nav items={navItems} />}
      {cta && <Button label={cta.label} href={cta.href} variant={cta.variant} />}
      {children}
    </header>
  );
}
