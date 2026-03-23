'use client';

import React from 'react';
import { Icon } from './Icon';

interface FooterProps {
  columns?: Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;
  copyright?: string;
  socialLinks?: Array<{ icon: string; href: string }>;
  className?: string;
  children?: React.ReactNode;
}

export function Footer({ columns, copyright, socialLinks, className, children }: FooterProps) {
  return (
    <footer className={className}>
      {columns && (
        <div>
          {columns.map((column) => (
            <div key={column.title}>
              <span>{column.title}</span>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {socialLinks && (
        <div>
          {socialLinks.map((social) => (
            <a key={social.href} href={social.href}>
              <Icon name={social.icon} />
            </a>
          ))}
        </div>
      )}
      {copyright && <p>{copyright}</p>}
      {children}
    </footer>
  );
}
