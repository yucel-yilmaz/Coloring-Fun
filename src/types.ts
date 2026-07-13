export type ToolType = 'brush' | 'bucket' | 'eraser';

export type BrushType = 'pencil' | 'marker' | 'crayon' | 'spray';

export type AgeBand = '3-5' | '6-8' | '9-12';
export type Difficulty = 'easy' | 'medium' | 'detailed';
// Categories are data-driven (admin can add new ones), so any slug is valid.
// The known values are listed for autocomplete/documentation only.
export type ColoringCategory =
  | 'animals'
  | 'dinos'
  | 'vehicles'
  | 'people'
  | 'places'
  | 'space'
  | (string & {});

export interface ColoringPage {
  id: string;
  title: string;
  lineArtUrl: string;
  maskUrl?: string;
  source: 'curated' | 'generated' | 'community';
  artworkId?: string;
  ageBand?: AgeBand;
  difficulty?: Difficulty;
  cardBgColor: string;
  category: ColoringCategory;
  hoverBorderColor: string;
}

/** Compatibility alias while the canvas components migrate to ColoringPage. */
export type Animal = ColoringPage & { name: string; nameTr: string };

export interface GalleryItem {
  id: string;
  title: string;
  animalId: string;
  date: string;
  imageUrl: string;
  isStarred?: boolean;
}
