'use client';

interface NavProps {
  items?: Array<{ label: string; href: string }>;
  logo?: string;
  className?: string;
}

export function Nav({ items = [], logo, className }: NavProps) {
  return (
    <nav className={className}>
      {logo && <img src={logo} alt="Logo" />}
      {items.map((item, index) => (
        <a
          key={index}
          href={item.href}
          style={{ color: 'var(--color-primary)' }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
