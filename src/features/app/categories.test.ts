import { describe, expect, it } from 'vitest';
import { buildCategoryTabs, slugifyCategory } from './categories';

// Minimal i18n stub: known category keys resolve to a readable label, everything else echoes the key.
const t = ((key: string) => {
  const map: Record<string, string> = {
    'animalSelection.all': 'All',
    'animalSelection.animals': 'Animal Friends',
    'animalSelection.dinos': 'Dinosaurs',
    'animalSelection.space': 'Space',
  };
  return map[key] ?? key;
}) as never;

describe('buildCategoryTabs', () => {
  it('always leads with an "all" tab carrying the total count', () => {
    const tabs = buildCategoryTabs({ animals: 3 }, 3, t);
    expect(tabs[0]).toMatchObject({ id: 'all', count: 3 });
  });

  it('hides categories with no pages and shows the ones that have pages', () => {
    const tabs = buildCategoryTabs({ animals: 2, dinos: 0 }, 2, t);
    const ids = tabs.map((tab) => tab.id);
    expect(ids).toContain('animals');
    expect(ids).not.toContain('dinos'); // empty → hidden
    expect(ids).not.toContain('space'); // absent → hidden
  });

  it('keeps known categories in curated order and appends unknown ones alphabetically', () => {
    const tabs = buildCategoryTabs({ space: 1, animals: 1, food: 1, ballet: 1 }, 4, t);
    expect(tabs.map((tab) => tab.id)).toEqual(['all', 'animals', 'space', 'ballet', 'food']);
  });

  it('gives admin-created categories a title-cased label and a fallback emoji', () => {
    const tabs = buildCategoryTabs({ 'deniz-canlilari': 1 }, 1, t);
    const custom = tabs.find((tab) => tab.id === 'deniz-canlilari');
    expect(custom).toMatchObject({ label: 'Deniz Canlilari', emoji: '🎨', count: 1 });
  });

  it('uses the translated label for known categories', () => {
    const tabs = buildCategoryTabs({ animals: 5 }, 5, t);
    expect(tabs.find((tab) => tab.id === 'animals')?.label).toBe('Animal Friends');
  });
});

describe('slugifyCategory', () => {
  it('lowercases and hyphenates free text', () => {
    expect(slugifyCategory('Deniz Canlıları')).toBe('deniz-canlilari');
  });

  it('folds Turkish characters to ASCII', () => {
    expect(slugifyCategory('Uçan Şeyler')).toBe('ucan-seyler');
  });

  it('trims leading/trailing separators and caps length', () => {
    expect(slugifyCategory('  --Uzay!!  ')).toBe('uzay');
    expect(slugifyCategory('a'.repeat(40)).length).toBe(24);
  });
});
