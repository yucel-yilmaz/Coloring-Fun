const SUBJECTS: Record<string, string> = {
  'Sevimli aslan': 'single cute baby lion cub, one character only, one head only, one face only, no parent lion, no second animal',
  'Uzayda roket': 'a simple rocket flying in outer space',
  'Deniz kaplumbağası': 'a friendly sea turtle swimming underwater',
  'Dinozor pikniği': 'a cute dinosaur having a picnic',
  'Çiçek bahçesi': 'a simple flower garden scene with large flowers only, no people, no human character, no face, no anime',
  'İtfaiye aracı': 'a friendly simple fire truck',
};

const AGE_RULES: Record<string, string> = {
  '3-5': 'preschool, ultra simple rounded shapes, very few large enclosed areas',
  '6-8': 'young child, simple balanced shapes, large enclosed regions, minimal interior lines',
  '9-12': 'older child, clean moderate detail, keep regions large and texture-free',
};

const DIFFICULTY: Record<string, string> = {
  easy: 'very simple toddler coloring page, very few details',
  medium: 'simple coloring page, limited detail',
  detailed: 'kid coloring page, moderate clean detail without tiny elements',
};

const SCENES: Record<string, string> = {
  single: 'one centered subject, empty background',
  'simple-scene': 'one centered subject, minimal background with large simple shapes',
  'full-scene': 'organized scene, but avoid clutter and tiny background objects',
};

export function buildLocalImagePrompt(request: Record<string, string | undefined>) {
  return [
    SUBJECTS[request.subjectPreset || ''] || request.subjectPreset || 'a friendly animal',
    AGE_RULES[request.ageBand || ''] || 'simple large shapes',
    DIFFICULTY[request.difficulty || ''] || 'easy coloring page',
    SCENES[request.sceneDensity || ''] || 'minimal background',
    request.lineWeight === 'medium'
      ? 'clean medium outlines, all regions clearly enclosed'
      : 'thick bold outlines, all regions clearly enclosed',
  ].join(', ');
}
