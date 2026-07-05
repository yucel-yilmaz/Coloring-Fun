export type ToolType = 'brush' | 'bucket' | 'eraser';

export type BrushType = 'pencil' | 'marker' | 'crayon' | 'spray';

export interface Animal {
  id: string;
  name: string;
  nameTr: string;
  lineArtUrl: string;
  cardBgColor: string;
  category: 'animals' | 'dinos' | 'space';
  hoverBorderColor: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  animalId: string;
  date: string;
  imageUrl: string;
  isStarred?: boolean;
}
