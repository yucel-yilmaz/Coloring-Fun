import { describe, expect, it } from 'vitest';
import { buildLocalImagePrompt } from './local-prompt';

describe('buildLocalImagePrompt', () => {
  it('translates presets and keeps the local prompt compact', () => {
    const prompt = buildLocalImagePrompt({ subjectPreset: 'Sevimli aslan', ageBand: '3-5', difficulty: 'easy', sceneDensity: 'single', lineWeight: 'thick' });
    expect(prompt).toContain('single cute baby lion cub');
    expect(prompt).toContain('ultra simple rounded shapes');
    expect(prompt).toContain('thick bold outlines');
    expect(prompt.split(/\s+/).length).toBeLessThan(55);
    expect(prompt.length).toBeLessThan(380);
  });
});
