import type { GalleryItem } from '../../types';
import { playBubblePop } from '../../utils/audio';

export function downloadGalleryItem(item: GalleryItem) {
  playBubblePop();
  const link = document.createElement('a');
  link.href = item.imageUrl;
  link.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
