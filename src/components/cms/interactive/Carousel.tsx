'use client';

import React, { useState, useEffect } from 'react';

interface CarouselProps {
  slides: Array<{ image: string; alt: string; caption?: string }>;
  autoplay: boolean;
  interval: number;
}

export function Carousel({ slides, autoplay, interval }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(idx => (idx + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, slides.length]);

  if (slides.length === 0) return null;

  const goToPrev = () =>
    setCurrentIndex(idx => (idx - 1 + slides.length) % slides.length);
  const goToNext = () =>
    setCurrentIndex(idx => (idx + 1) % slides.length);

  const slide = slides[currentIndex];

  return (
    <div>
      <img src={slide.image} alt={slide.alt} />
      {slide.caption && <p>{slide.caption}</p>}
      <button type="button" onClick={goToPrev} aria-label="Previous slide">
        Prev
      </button>
      <button type="button" onClick={goToNext} aria-label="Next slide">
        Next
      </button>
    </div>
  );
}
