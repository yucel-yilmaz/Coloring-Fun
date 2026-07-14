import { describe, expect, it } from 'vitest';
import { analyze, assertSafeSvg, intersectionOverUnion, renderMask } from './svg-evaluate';

const SAFE_SVG = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="white"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="black" stroke-width="18"/>
    <circle cx="210" cy="230" r="20" fill="none" stroke="black" stroke-width="12"/>
    <circle cx="302" cy="230" r="20" fill="none" stroke="black" stroke-width="12"/>
  </svg>
`);

describe('SVG evaluation', () => {
  it('detects closed coloring regions and stable raster fidelity', async () => {
    const first = await renderMask(SAFE_SVG);
    const second = await renderMask(SAFE_SVG);
    expect(analyze(first).closedRegions).toBeGreaterThanOrEqual(3);
    expect(intersectionOverUnion(first, second)).toBe(1);
  });

  it('rejects active and external SVG content', () => {
    expect(() => assertSafeSvg('<svg><script>alert(1)</script></svg>')).toThrow();
    expect(() => assertSafeSvg('<svg><image href="https://example.com/a.png"/></svg>')).toThrow();
    expect(() => assertSafeSvg(SAFE_SVG.toString('utf8'))).not.toThrow();
  });
});
