'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ModalProps {
  trigger: { label: string; variant?: string };
  children: React.ReactNode;
}

export function Modal({ trigger, children }: ModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        {trigger.label}
      </button>
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen ? 'true' : 'false'}
        style={isOpen ? undefined : { display: 'none' }}
        onClick={close}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  );
}
