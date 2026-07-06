import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 512;

interface MaskAnalysis {
  dark: Uint8Array;
  closedRegions: number;
  enclosedWhitePixels: number;
}

export async function renderMask(input: Buffer): Promise<Uint8Array> {
  const { data } = await sharp(input)
    .flatten({ background: '#ffffff' })
    .resize(SIZE, SIZE, { fit: 'contain', background: '#ffffff' })
    .grayscale()
    .threshold(185)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(SIZE * SIZE);
  for (let index = 0; index < mask.length; index += 1) mask[index] = data[index] < 128 ? 1 : 0;
  return mask;
}

export function analyze(mask: Uint8Array): MaskAnalysis {
  const visited = new Uint8Array(mask.length);
  let closedRegions = 0;
  let enclosedWhitePixels = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] || visited[start]) continue;
    const stack = [start];
    visited[start] = 1;
    let touchesBorder = false;
    let area = 0;
    while (stack.length) {
      const index = stack.pop()!;
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      area += 1;
      if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) touchesBorder = true;
      for (const next of [index - 1, index + 1, index - SIZE, index + SIZE]) {
        if (next < 0 || next >= mask.length || visited[next] || mask[next]) continue;
        const nextX = next % SIZE;
        if (Math.abs(nextX - x) > 1) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }
    if (!touchesBorder && area >= 12) {
      closedRegions += 1;
      enclosedWhitePixels += area;
    }
  }
  return { dark: mask, closedRegions, enclosedWhitePixels };
}

export function intersectionOverUnion(first: Uint8Array, second: Uint8Array) {
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] || second[index]) union += 1;
    if (first[index] && second[index]) intersection += 1;
  }
  return union ? intersection / union : 0;
}

export function assertSafeSvg(svg: string) {
  const unsafe = /<script|<foreignObject|\son[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|data:|\/\/)/i;
  if (unsafe.test(svg)) throw new Error('aktif veya harici SVG içeriği bulundu');
}

async function main() {
  const directory = path.resolve(process.argv[2] || 'samples/svg-evaluation');
  const files = await readdir(directory);
  const sources = files.filter((file) => /\.(png|jpe?g)$/i.test(file));
  if (!sources.length) throw new Error(`${directory} içinde PNG/JPG kaynak bulunamadı.`);
  const rows: Array<Record<string, string | number | boolean>> = [];

  for (const sourceFile of sources) {
    const base = sourceFile.replace(/\.(png|jpe?g)$/i, '');
    const source = analyze(await renderMask(await readFile(path.join(directory, sourceFile))));
    const variants = files.filter((file) => file.startsWith(`${base}.`) && file.endsWith('.svg'));
    for (const variant of variants) {
      const svgBuffer = await readFile(path.join(directory, variant));
      const svg = svgBuffer.toString('utf8');
      let safe = true;
      let safetyError = '';
      try { assertSafeSvg(svg); } catch (error) { safe = false; safetyError = error instanceof Error ? error.message : 'güvensiz SVG'; }
      const candidate = analyze(await renderMask(svgBuffer));
      const closureRetention = source.closedRegions ? Math.min(1, candidate.closedRegions / source.closedRegions) : 0;
      const fillLeakage = 1 - closureRetention;
      const lineIou = intersectionOverUnion(source.dark, candidate.dark);
      const pathCount = (svg.match(/<path\b/gi) || []).length;
      const bytes = (await stat(path.join(directory, variant))).size;
      const passed = safe && fillLeakage <= 0.05 && lineIou >= 0.7 && pathCount <= 2000;
      rows.push({ source: sourceFile, variant, engine: variant.slice(base.length + 1, -4), closedRegions: candidate.closedRegions, closureRetention: Number(closureRetention.toFixed(3)), fillLeakage: Number(fillLeakage.toFixed(3)), lineIou: Number(lineIou.toFixed(3)), pathCount, bytes, safe, passed, note: safetyError });
    }
  }

  console.table(rows);
  const aggregate = new Map<string, { total: number; passed: number; leakage: number; iou: number }>();
  for (const row of rows) {
    const item = aggregate.get(String(row.engine)) || { total: 0, passed: 0, leakage: 0, iou: 0 };
    item.total += 1; item.passed += row.passed ? 1 : 0; item.leakage += Number(row.fillLeakage); item.iou += Number(row.lineIou);
    aggregate.set(String(row.engine), item);
  }
  console.log('\nMotor özeti');
  console.table([...aggregate].map(([engine, value]) => ({ engine, samples: value.total, passRate: value.passed / value.total, averageLeakage: value.leakage / value.total, averageLineIou: value.iou / value.total, releaseReady: value.total >= 50 && value.passed / value.total >= 0.95 && value.leakage / value.total <= 0.05 })));
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
