import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Gallery } from '@/lib/addons/gallery/components/Gallery';

afterEach(cleanup);

const baseImages = [
  { src: '/img/photo1.jpg', alt: 'Photo 1' },
  { src: '/img/photo2.jpg', alt: 'Photo 2' },
  { src: '/img/photo3.jpg', alt: 'Photo 3' },
];

describe('Gallery component', () => {
  // Test 1: Renders correct number of image elements matching images array length
  it('renders correct number of image elements matching images array length', () => {
    const { container } = render(
      <Gallery images={baseImages} layout="grid" columns={3} />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(baseImages.length);
  });

  // Test 2: Each image has correct src and alt attributes
  it('each image has correct src and alt attributes', () => {
    render(<Gallery images={baseImages} layout="grid" columns={3} />);
    baseImages.forEach((image) => {
      const img = screen.getByAltText(image.alt);
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('src', image.src);
      expect(img).toHaveAttribute('alt', image.alt);
    });
  });

  // Test 3: Grid layout applies grid CSS class/style
  it('grid layout applies grid CSS class/style', () => {
    const { container } = render(
      <Gallery images={baseImages} layout="grid" columns={3} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('gallery-grid');
    expect(wrapper.style.display).toBe('grid');
  });

  // Test 4: Renders captions when provided
  it('renders captions when provided', () => {
    const imagesWithCaptions = [
      { src: '/img/a.jpg', alt: 'Image A', caption: 'Caption A' },
      { src: '/img/b.jpg', alt: 'Image B' },
      { src: '/img/c.jpg', alt: 'Image C', caption: 'Caption C' },
    ];
    render(<Gallery images={imagesWithCaptions} layout="grid" columns={3} />);
    expect(screen.getByText('Caption A')).not.toBeNull();
    expect(screen.queryByText('Caption B')).toBeNull();
    expect(screen.getByText('Caption C')).not.toBeNull();
  });
});
