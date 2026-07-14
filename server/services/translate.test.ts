import { describe, expect, it } from 'vitest';
import { translateToEnglish } from './translate';

describe('translateToEnglish', () => {
  it('skips translation for text that is already ASCII/English', async () => {
    expect(await translateToEnglish('A rocket flying in space')).toBe('A rocket flying in space');
  });

  it('returns the original text unchanged when no moderation key is configured', async () => {
    expect(await translateToEnglish('Uzayda uçan bir roket')).toBe('Uzayda uçan bir roket');
  });

  it('returns an empty string for empty input without calling the API', async () => {
    expect(await translateToEnglish('   ')).toBe('');
  });
});
