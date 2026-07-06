import { describe, expect, it } from 'vitest';
import { localTextSafetyCheck } from './moderation';

describe('localTextSafetyCheck', () => {
  it('allows an ordinary coloring idea', () => {
    expect(localTextSafetyCheck('Çiçeklerin yanında sevimli bir aslan olsun.').flagged).toBe(false);
  });

  it('blocks clearly unsafe child content', () => {
    expect(localTextSafetyCheck('Kanlı bir silah sahnesi çiz.').flagged).toBe(true);
  });

  it('blocks personal contact information', () => {
    expect(localTextSafetyCheck('Bana test@example.com adresinden ulaş.').flagged).toBe(true);
  });
});
