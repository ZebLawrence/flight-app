import type { AddonModule } from '../types';
import { Gallery } from './components/Gallery';
import { Lightbox } from './components/Lightbox';

export const galleryAddon: AddonModule = {
  key: 'gallery',
  name: 'Gallery',
  components: {
    Gallery,
    Lightbox,
  },
};
