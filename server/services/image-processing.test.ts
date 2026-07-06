import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processLineArt } from './image-processing';

describe('line art processing', () => {
  it('normalizes an image to the portrait coloring canvas', async () => {
    const input = await sharp({ create: { width: 400, height: 600, channels: 3, background: 'white' } })
      .composite([{ input: Buffer.from('<svg width="400" height="600"><rect x="50" y="50" width="300" height="500" rx="60" fill="none" stroke="black" stroke-width="14"/><circle cx="200" cy="230" r="80" fill="none" stroke="black" stroke-width="12"/></svg>') }])
      .png().toBuffer();
    const result = await processLineArt(input, 'portrait');
    expect(result.width).toBe(1024);
    expect(result.height).toBe(1536);
    expect(result.processed.length).toBeGreaterThan(1000);
    expect(result.enclosedRegionCount).toBeGreaterThanOrEqual(2);
    expect(result.enclosedWhiteRatio).toBeGreaterThan(0.08);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.sha256).toMatch(/^[a-f\d]{64}$/);
  });

  it('rejects an empty page with no closed coloring region', async () => {
    const input = await sharp({ create: { width: 400, height: 600, channels: 3, background: 'white' } }).png().toBuffer();
    const result = await processLineArt(input, 'portrait');
    expect(result.enclosedRegionCount).toBe(0);
    expect(result.score).toBeLessThan(75);
  });

  it('accepts thick outlines when they still contain large closed fill areas', async () => {
    const input = await sharp({ create: { width: 400, height: 600, channels: 3, background: 'white' } })
      .composite([{ input: Buffer.from('<svg width="400" height="600"><rect x="45" y="45" width="310" height="510" rx="80" fill="none" stroke="black" stroke-width="26"/><circle cx="200" cy="260" r="95" fill="none" stroke="black" stroke-width="22"/></svg>') }])
      .png().toBuffer();
    const result = await processLineArt(input, 'portrait');
    expect(result.enclosedRegionCount).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});
