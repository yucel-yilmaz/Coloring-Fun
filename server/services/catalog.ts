import { ANIMALS } from '../../src/data';
import type { Animal } from '../../src/types';
import { requireSupabase } from '../supabase';

export interface CatalogOverride {
  page_id: string;
  title: string | null;
  category: Animal['category'] | null;
  line_art_url?: string | null;
  card_bg_color?: string | null;
  hidden: boolean;
}

const CUSTOM_CARD_COLORS = [
  'bg-[#dff3e4]',
  'bg-[#e6e0ff]',
  'bg-[#fff2b2]',
  'bg-[#ffe1dc]',
] as const;

export function applyCatalogOverride(page: Animal, override?: CatalogOverride) {
  return {
    ...page,
    name: override?.title || page.name,
    nameTr: override?.title || page.nameTr,
    title: override?.title || page.title,
    category: override?.category || page.category,
    hidden: Boolean(override?.hidden),
  };
}

export async function getCatalogOverrides() {
  const { data, error } = await requireSupabase()
    .from('coloring_page_overrides')
    .select('page_id, title, category, line_art_url, card_bg_color, hidden');
  if (error) {
    if (error.code === '42703') {
      const { data: fallbackData, error: fallbackError } = await requireSupabase()
        .from('coloring_page_overrides')
        .select('page_id, title, category, hidden');
      if (fallbackError) throw fallbackError;
      return (fallbackData || []) as CatalogOverride[];
    }
    if (['42P01', 'PGRST205'].includes(error.code || '')) return [];
    throw error;
  }
  return (data || []) as CatalogOverride[];
}

export async function getCatalogPages() {
  const overrides = await getCatalogOverrides();
  const overrideById = new Map(overrides.map((item) => [item.page_id, item]));
  const curated = ANIMALS.map((page) => applyCatalogOverride(page, overrideById.get(page.id)));
  const curatedIds = new Set(ANIMALS.map((page) => page.id));
  const customPages = overrides
    .filter((item) => item.line_art_url && !curatedIds.has(item.page_id))
    .map((item, index) => ({
      id: item.page_id,
      name: item.title || 'Yeni boyama sayfası',
      nameTr: item.title || 'Yeni boyama sayfası',
      title: item.title || 'Yeni boyama sayfası',
      source: 'curated' as const,
      lineArtUrl: item.line_art_url!,
      cardBgColor: item.card_bg_color || CUSTOM_CARD_COLORS[index % CUSTOM_CARD_COLORS.length],
      category: item.category || 'animals',
      hoverBorderColor: 'group-hover:bg-[#001e30]',
      hidden: Boolean(item.hidden),
    }));
  return [...curated, ...customPages];
}
