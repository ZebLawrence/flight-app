import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Image } from '@/components/cms/content/Image';

describe('Image component', () => {
  it('renders an <img> with correct src and alt attributes', () => {
    const { container } = render(
      <Image src="https://example.com/hero.jpg" alt="Hero image" width={1200} height={600} />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('Hero image');
    expect(img?.getAttribute('src')).toContain('hero.jpg');
  });

  it('applies width and height props', () => {
    const { container } = render(
      <Image src="https://example.com/photo.jpg" alt="Photo" width={800} height={400} />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('width')).toBe('800');
    expect(img?.getAttribute('height')).toBe('400');
  });

  it('applies objectFit as CSS object-fit style', () => {
    const { container } = render(
      <Image
        src="https://example.com/cover.jpg"
        alt="Cover"
        width={600}
        height={300}
        objectFit="cover"
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.style.objectFit).toBe('cover');
  });

  it('forwards className to the image element', () => {
    const { container } = render(
      <Image
        src="https://example.com/img.jpg"
        alt="Classed image"
        width={400}
        height={200}
        className="my-image-class"
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.classList.contains('my-image-class')).toBe(true);
  });
});
