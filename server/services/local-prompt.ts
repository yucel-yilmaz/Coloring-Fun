const SUBJECTS: Record<string, string> = {
  'Sevimli aslan': 'a friendly cute lion',
  'Uzayda roket': 'a simple rocket flying in outer space',
  'Deniz kaplumbağası': 'a friendly sea turtle swimming underwater',
  'Dinozor pikniği': 'a cute dinosaur having a picnic',
  'Çiçek bahçesi': 'a simple garden with large flowers',
  'İtfaiye aracı': 'a friendly simple fire truck',
};

const AGE_RULES: Record<string, string> = {
  '3-5': 'preschool, simple rounded shapes, few clear details',
  '6-8': 'young child, simple balanced shapes, readable scene details',
  '9-12': 'older child, moderate clean detail without texture',
};

const DIFFICULTY: Record<string, string> = {
  easy: 'easy coloring page',
  medium: 'medium detail coloring page',
  detailed: 'detailed coloring page',
};

const SCENES: Record<string, string> = {
  single: 'one centered subject, empty background',
  'simple-scene': 'one centered subject, minimal background',
  'full-scene': 'complete scene, organized background',
};

export function buildLocalImagePrompt(request: Record<string, string | undefined>) {
  return [
    SUBJECTS[request.subjectPreset || ''] || request.subjectPreset || 'a friendly animal',
    AGE_RULES[request.ageBand || ''] || 'simple large shapes',
    DIFFICULTY[request.difficulty || ''] || 'easy coloring page',
    SCENES[request.sceneDensity || ''] || 'minimal background',
    request.lineWeight === 'medium' ? 'clean medium outlines' : 'thick bold outlines',
  ].join(', ');
}
