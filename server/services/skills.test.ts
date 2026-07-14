import { describe, expect, it } from 'vitest';
import { validateTemplate } from './skills';

describe('skill templates', () => {
  it('accepts the fixed coloring recipe variables', () => {
    expect(() => validateTemplate('Draw {{subject}} for {{ageBand}} with {{lineWeight}} lines.')).not.toThrow();
  });

  it('rejects unknown variables', () => {
    expect(() => validateTemplate('Draw {{subject}} and {{rawPrompt}}')).toThrow('İzin verilmeyen değişken');
  });
});
