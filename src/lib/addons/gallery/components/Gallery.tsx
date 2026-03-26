export interface GalleryProps {
  images: Array<{ src: string; alt: string; caption?: string }>;
  layout: 'grid' | 'masonry';
  columns: number;
}

export function Gallery({ images, layout, columns }: GalleryProps) {
  const containerStyle =
    layout === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }
      : {
          columnCount: columns,
        };

  return (
    <div
      className={layout === 'grid' ? 'gallery-grid' : 'gallery-masonry'}
      style={containerStyle}
    >
      {images.map((image) => (
        <figure key={image.src}>
          <img src={image.src} alt={image.alt} />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
