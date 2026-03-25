'use client';

import React, { useState } from 'react';

interface AccordionProps {
  items: Array<{ title: string; content: string }>;
  allowMultiple: boolean;
}

export function Accordion({ items, allowMultiple }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div>
      {items.map((item, index) => {
        const isOpen = openItems.has(index);
        return (
          <div key={item.title}>
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
            >
              {item.title}
            </button>
            <div
              aria-hidden={!isOpen ? 'true' : 'false'}
              style={isOpen ? undefined : { display: 'none' }}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
