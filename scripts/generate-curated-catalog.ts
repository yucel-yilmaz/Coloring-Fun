import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AI_GENERATED_PAGES } from '../src/data/aiGeneratedPages';
import { processLineArt } from '../server/services/image-processing';

const endpoint = process.env.LOCAL_IMAGE_API_URL || 'http://127.0.0.1:7861';
const outputDirectory = resolve('public/generated');
const attemptsPerPage = 3;
const basePrompt = [
  'preschool age 3-5',
  'easy paint bucket coloring page',
  'one centered subject',
  'empty or extremely minimal background',
  'few large shapes',
  'thick unbroken black outlines',
  'large fully enclosed white regions',
  'no color',
  'no gray',
  'no shading',
  'no hatching',
  'no small texture',
  'no text',
  'no border',
  'no signature',
].join(', ');

async function fileExists(path: string) {
  try {
    return (await stat(path)).size > 1_000;
  } catch {
    return false;
  }
}

async function generate(prompt: string) {
  const response = await fetch(`${endpoint}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, orientation: 'portrait' }),
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!response.ok) throw new Error(`Local generator ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(outputDirectory, { recursive: true });
let completed = 0;
let skipped = 0;
const failures: string[] = [];

for (const [index, page] of AI_GENERATED_PAGES.entries()) {
  const outputPath = resolve(outputDirectory, page.file);
  if (await fileExists(outputPath)) {
    skipped += 1;
    console.log(`[${index + 1}/${AI_GENERATED_PAGES.length}] SKIP ${page.nameTr}`);
    continue;
  }

  let accepted = false;
  for (let attempt = 1; attempt <= attemptsPerPage; attempt += 1) {
    console.log(`[${index + 1}/${AI_GENERATED_PAGES.length}] GEN  ${page.nameTr} (${attempt}/${attemptsPerPage})`);
    try {
      const source = await generate(`${page.prompt}, ${basePrompt}`);
      const result = await processLineArt(source, 'portrait');
      const fillable = result.score >= 75 && result.enclosedRegionCount >= 1 && result.enclosedWhiteRatio >= 0.06;
      console.log(`[${index + 1}/${AI_GENERATED_PAGES.length}] QA   score=${result.score} regions=${result.enclosedRegionCount} fill=${result.enclosedWhiteRatio.toFixed(3)}`);
      if (!fillable) continue;
      await writeFile(outputPath, result.processed);
      completed += 1;
      accepted = true;
      console.log(`[${index + 1}/${AI_GENERATED_PAGES.length}] OK   ${page.file}`);
      break;
    } catch (error) {
      console.error(`[${index + 1}/${AI_GENERATED_PAGES.length}] ERR  ${error instanceof Error ? error.message : error}`);
    }
  }

  if (!accepted) failures.push(page.nameTr);
}

console.log(JSON.stringify({ completed, skipped, failures, total: AI_GENERATED_PAGES.length }, null, 2));
if (failures.length) process.exitCode = 1;
