import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Carousel } from '@/components/cms/interactive/Carousel';

afterEach(cleanup);

const slides = [
  { image: '/img/slide1.jpg', alt: 'Slide one', caption: 'First caption' },
  { image: '/img/slide2.jpg', alt: 'Slide two' },
  { image: '/img/slide3.jpg', alt: 'Slide three', caption: 'Third caption' },
];

describe('Carousel component', () => {
  it('renders first slide image with correct src and alt', () => {
    render(<Carousel slides={slides} autoplay={false} interval={3000} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/img/slide1.jpg');
    expect(img.getAttribute('alt')).toBe('Slide one');
  });

  it('renders prev and next navigation buttons', () => {
    render(<Carousel slides={slides} autoplay={false} interval={3000} />);
    expect(screen.getByRole('button', { name: /previous slide/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /next slide/i })).not.toBeNull();
  });

  it('shows caption when provided', () => {
    render(<Carousel slides={slides} autoplay={false} interval={3000} />);
    expect(screen.getByText('First caption')).not.toBeNull();
  });
});
