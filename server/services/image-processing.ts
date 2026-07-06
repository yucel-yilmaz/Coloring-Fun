import { createHash } from 'node:crypto';
import sharp from 'sharp';

interface FillabilityMetrics {
  enclosedRegionCount: number;
  enclosedWhiteRatio: number;
}

function measureFillability(data: Buffer, width: number, height: number, channels: number): FillabilityMetrics {
  const visited = new Uint8Array(width * height);
  let enclosedRegionCount = 0;
  let enclosedPixels = 0;
  const minimumRegionArea = Math.max(8, Math.round(width * height * 0.0004));

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || data[start * channels] < 128) continue;
    const stack = [start];
    visited[start] = 1;
    let area = 0;
    let touchesEdge = false;

    while (stack.length) {
      const index = stack.pop()!;
      const x = index % width;
      const y = Math.floor(index / width);
      area += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= width * height || visited[next] || data[next * channels] < 128) continue;
        const nextX = next % width;
        if ((x === 0 && nextX === width - 1) || (x === width - 1 && nextX === 0)) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    if (!touchesEdge && area >= minimumRegionArea) {
      enclosedRegionCount += 1;
      enclosedPixels += area;
    }
  }

  return {
    enclosedRegionCount,
    enclosedWhiteRatio: enclosedPixels / (width * height),
  };
}

export async function processLineArt(input: Buffer, orientation: 'portrait' | 'landscape') {
  const width = orientation === 'portrait' ? 1024 : 1536;
  const height = orientation === 'portrait' ? 1536 : 1024;
  const processed = await sharp(input)
    .flatten({ background: '#ffffff' })
    .resize(width, height, { fit: 'contain', background: '#ffffff' })
    .grayscale()
    .normalize()
    .threshold(185)
    .png()
    .toBuffer();
  const raw = await sharp(processed).raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let index = 0; index < raw.data.length; index += raw.info.channels) {
    if (raw.data[index] < 128) dark += 1;
  }
  const total = raw.info.width * raw.info.height;
  const darkRatio = dark / total;
  const analysis = await sharp(processed)
    .resize(256, 256, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fillability = measureFillability(
    analysis.data,
    analysis.info.width,
    analysis.info.height,
    analysis.info.channels,
  );
  // Thresholding turns soft gray edges into black pixels, so otherwise valid
  // thick-outline pages often land around 20–25% dark coverage. Keep the hard
  // penalty for genuinely ink-heavy pages, not ordinary bucket-fill borders.
  const densityScore = darkRatio >= 0.01 && darkRatio <= 0.4
    ? 30
    : Math.max(0, 30 - Math.abs(darkRatio - 0.2) * 150);
  const contrastScore = new Set(raw.data.subarray(0, Math.min(raw.data.length, 100_000))).size <= 4 ? 10 : 5;
  const whitespaceScore = darkRatio < 0.4 ? 20 : Math.max(0, 20 - (darkRatio - 0.4) * 100);
  const fillableAreaScore = fillability.enclosedWhiteRatio >= 0.08 ? 30 : fillability.enclosedWhiteRatio * 375;
  const simplicityScore = fillability.enclosedRegionCount >= 1 && fillability.enclosedRegionCount <= 45
    ? 10
    : fillability.enclosedRegionCount > 70 ? 0 : 5;
  const score = Math.round(Math.min(100, densityScore + contrastScore + whitespaceScore + fillableAreaScore + simplicityScore));
  const thumbnail = await sharp(processed).resize(360, 480, { fit: 'inside' }).png().toBuffer();
  return {
    processed,
    mask: processed,
    thumbnail,
    width,
    height,
    score,
    darkRatio,
    ...fillability,
    sha256: createHash('sha256').update(processed).digest('hex'),
  };
}
