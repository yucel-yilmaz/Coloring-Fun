import { describe, expect, it } from 'vitest';
import { buildLocalImagePrompt } from './local-prompt';

describe('buildLocalImagePrompt', () => {
  it('translates presets and keeps the local prompt compact', () => {
    const prompt = buildLocalImagePrompt({ subjectPreset: 'Sevimli aslan', ageBand: '3-5', difficulty: 'easy', sceneDensity: 'single', lineWeight: 'thick' });
    expect(prompt).toContain('friendly cute lion');
    expect(prompt).toContain('simple rounded shapes');
    expect(prompt.split(/\s+/).length).toBeLessThan(50);
    expect(prompt.length).toBeLessThan(300);
  });
});
