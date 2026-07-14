import type { TFunction } from 'i18next';

/** A category tab as rendered in the home selection bar. */
export interface CategoryTab {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind bg class used when the chip is active. */
  activeClass: string;
  count: number;
}

interface CategoryMeta {
  emoji: string;
  activeClass: string;
  i18nKey: string;
}

/** Built-in categories get a curated emoji, color, and translated label. */
export const KNOWN_CATEGORY_META: Record<string, CategoryMeta> = {
  animals: { emoji: '🐾', activeClass: 'bg-[#cbe6ff]', i18nKey: 'animalSelection.animals' },
  dinos: { emoji: '🦖', activeClass: 'bg-[#ffceca]', i18nKey: 'animalSelection.dinos' },
  vehicles: { emoji: '🚗', activeClass: 'bg-[#fff2b2]', i18nKey: 'animalSelection.vehicles' },
  people: { emoji: '🧑', activeClass: 'bg-[#e6e0ff]', i18nKey: 'animalSelection.people' },
  places: { emoji: '🏠', activeClass: 'bg-[#dff3e4]', i18nKey: 'animalSelection.places' },
  space: { emoji: '🚀', activeClass: 'bg-[#dde3ff]', i18nKey: 'animalSelection.space' },
};

export const KNOWN_CATEGORY_ORDER = ['animals', 'dinos', 'vehicles', 'people', 'places', 'space'];

// Fallback palette for admin-created categories that have no curated color.
const FALLBACK_ACTIVE_CLASSES = ['bg-[#ffe0ef]', 'bg-[#d9f5e8]', 'bg-[#efe0ff]', 'bg-[#ffedcf]', 'bg-[#d6efff]'];

/** Normalize a free-text category name into a safe slug (matches the backend's category rule). */
export function slugifyCategory(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

function titleCase(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function fallbackColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % FALLBACK_ACTIVE_CLASSES.length;
  return FALLBACK_ACTIVE_CLASSES[hash];
}

/**
 * Build the visible category tabs from the pages that actually exist: only categories with at least
 * one page are shown (empty ones disappear), and admin-created categories appear automatically once
 * a page uses them. Known categories keep their curated order/label; new ones sort alphabetically.
 */
export function buildCategoryTabs(
  counts: Record<string, number>,
  totalCount: number,
  t: TFunction,
): CategoryTab[] {
  const present = (id: string) => (counts[id] ?? 0) > 0;
  const known = KNOWN_CATEGORY_ORDER.filter(present);
  const extra = Object.keys(counts)
    .filter((id) => !KNOWN_CATEGORY_ORDER.includes(id) && present(id))
    .sort();

  const tabs: CategoryTab[] = [
    { id: 'all', label: t('animalSelection.all'), emoji: '✨', activeClass: 'bg-[#ffd700]', count: totalCount },
  ];
  for (const id of [...known, ...extra]) {
    const meta = KNOWN_CATEGORY_META[id];
    tabs.push({
      id,
      label: meta ? t(meta.i18nKey) : titleCase(id),
      emoji: meta?.emoji ?? '🎨',
      activeClass: meta?.activeClass ?? fallbackColor(id),
      count: counts[id] ?? 0,
    });
  }
  return tabs;
}
