'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LightboxProps {
  images: Array<{ src: string; alt: string; caption?: string }>;
}

export function Lightbox({ images }: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  const showPrev = useCallback(() => {
    setActiveIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeIndex, close, showPrev, showNext]);

  return (
    <>
      <div className="lightbox-thumbnails">
        {images.map((image, index) => (
          <button
            key={image.src}
            className="lightbox-thumbnail"
            onClick={() => setActiveIndex(index)}
            aria-label={`Open lightbox for ${image.alt}`}
          >
            <img src={image.src} alt={image.alt} />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Lightbox"
          onClick={close}
        >
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="lightbox-image"
            />
            {images[activeIndex].caption && (
              <p className="lightbox-caption">{images[activeIndex].caption}</p>
            )}
            <button
              className="lightbox-prev"
              onClick={showPrev}
              aria-label="Previous image"
            >
              &#8249;
            </button>
            <button
              className="lightbox-next"
              onClick={showNext}
              aria-label="Next image"
            >
              &#8250;
            </button>
            <button
              className="lightbox-close"
              onClick={close}
              aria-label="Close lightbox"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
