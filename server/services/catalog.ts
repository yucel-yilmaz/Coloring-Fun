import { ANIMALS } from '../../src/data';
import type { Animal } from '../../src/types';
import { requireSupabase } from '../supabase';

export interface CatalogOverride {
  page_id: string;
  title: string | null;
  category: Animal['category'] | null;
  hidden: boolean;
}

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
    .select('page_id, title, category, hidden');
  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code || '')) return [];
    throw error;
  }
  return (data || []) as CatalogOverride[];
}

export async function getCatalogPages() {
  const overrides = await getCatalogOverrides();
  const overrideById = new Map(overrides.map((item) => [item.page_id, item]));
  return ANIMALS.map((page) => applyCatalogOverride(page, overrideById.get(page.id)));
}
