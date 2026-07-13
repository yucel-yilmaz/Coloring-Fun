export type AppTab = 'home' | 'gallery' | 'settings';
// 'all' plus any category slug present in the catalog (data-driven; admin can add new ones).
export type AnimalCategory = 'all' | (string & {});
