import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Lightbox } from '@/lib/addons/gallery/components/Lightbox';

afterEach(cleanup);

const baseImages = [
  { src: '/img/photo1.jpg', alt: 'Photo 1' },
  { src: '/img/photo2.jpg', alt: 'Photo 2' },
  { src: '/img/photo3.jpg', alt: 'Photo 3' },
];

describe('Lightbox component', () => {
  // Test 1: Renders clickable image thumbnails
  it('renders clickable image thumbnails', () => {
    render(<Lightbox images={baseImages} />);
    const buttons = screen.getAllByRole('button', { name: /open lightbox/i });
    expect(buttons).toHaveLength(baseImages.length);
    baseImages.forEach((image) => {
      expect(screen.getByAltText(image.alt)).not.toBeNull();
    });
  });

  // Test 2: Overlay is hidden on initial render
  it('overlay is hidden on initial render', () => {
    render(<Lightbox images={baseImages} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // Test 3: Prev/next buttons are present in the lightbox DOM
  it('prev/next buttons are present in the lightbox DOM', () => {
    render(<Lightbox images={baseImages} />);

    const firstThumbnail = screen.getAllByRole('button', { name: /open lightbox/i })[0];
    fireEvent.click(firstThumbnail);

    expect(screen.getByRole('button', { name: /previous image/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /next image/i })).not.toBeNull();
  });
});
