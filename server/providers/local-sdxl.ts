import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config';
import { requireSupabase } from '../supabase';
import type { ImageProvider, ProviderGenerationRequest } from './types';

const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;
const DEFAULT_WORKFLOW_FILE = 'ColoringBooks.json';

type LocalBackend = 'local-ai' | 'comfyui';

type ComfyHistoryResponse = Record<string, {
  outputs?: Record<string, {
    images?: Array<{
      filename?: string;
      subfolder?: string;
      type?: string;
    }>;
  }>;
}>;

type ComfyWorkflowNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
  _meta?: { title?: string };
};

type ComfyWorkflow = Record<string, ComfyWorkflowNode>;

function splitPromptForComfy(prompt: string) {
  const text = prompt.trim();
  if (!text) return { positive: '', negative: '' };
  const marker = /\n\s*Avoid:\s*/i;
  const parts = text.split(marker);
  if (parts.length < 2) return { positive: text, negative: '' };
  const positive = parts.shift()?.trim() || '';
  const negative = parts.join(', ').replace(/\s+/g, ' ').trim();
  return { positive, negative };
}

function injectSubjectIntoPositive(template: string, subjectPrompt: string) {
  const subject = subjectPrompt.trim();
  if (!subject) return template;
  if (template.includes('{{subject}}')) return template.replace('{{subject}}', subject);

  const giraffePhrase = /single cute baby giraffe, standing side view, four legs only, one head, one long neck, two small horns, one tail, simple correct animal anatomy/i;
  if (giraffePhrase.test(template)) return template.replace(giraffePhrase, subject);

  return `${template}, ${subject}`;
}

function shortenForLog(text: string, maxLength = 320) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function extractReferenceQueryText(inputText: string) {
  const subjectMatch = inputText.match(/Subject:\s*(.+?)(?:\s+Composition:|\s+Difficulty:|\n|$)/i);
  if (subjectMatch?.[1]) return subjectMatch[1].trim();
  return inputText;
}

function extractKeywords(subjectText: string) {
  return subjectText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4)
    .slice(0, 4);
}

/**
 * Onaylanmış (published) bir görseli, konu metniyle örtüşen anahtar kelimelere göre bulur.
 * Eşleşme yoksa null döner ve ComfyUI akışı prompt-only moda düşer.
 */
async function findApprovedReferenceImage(subjectText: string) {
  const queryText = extractReferenceQueryText(subjectText);
  const keywords = extractKeywords(queryText);
  if (!keywords.length) return null;

  const supabase = requireSupabase();
  const filter = keywords.map((word) => `subject.ilike.%${word}%,title.ilike.%${word}%`).join(',');
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id')
    .eq('status', 'published')
    .or(filter)
    .order('published_at', { ascending: false })
    .limit(1);
  const artwork = artworks?.[0];
  if (!artwork) return null;

  const { data: asset } = await supabase
    .from('artwork_assets')
    .select('bucket, storage_path')
    .eq('artwork_id', artwork.id)
    .eq('kind', 'processed')
    .maybeSingle();
  if (!asset) return null;

  if (asset.bucket === 'public-artworks') {
    return supabase.storage.from(asset.bucket).getPublicUrl(asset.storage_path).data.publicUrl;
  }
  const { data: signed } = await supabase.storage.from(asset.bucket).createSignedUrl(asset.storage_path, 300);
  return signed?.signedUrl || null;
}

function buildPromptGuards(subjectPrompt: string) {
  const lower = subjectPrompt.toLowerCase();
  const isFlowerScene = /çiçek|flower|garden|bahçe/.test(lower);

  const antiAnimeNegative = '(anime:1.8), (manga:1.8), (waifu:1.8), (human:1.7), (person:1.7), (girl:1.8), (boy:1.6), (woman:1.8), (man:1.6), (female character:1.8), (male character:1.6), (portrait:1.7), (realistic face:1.8), (eyes focus:1.7), (headshot:1.8)';
  const nonHumanNegative = 'people, humans, character design, fashion illustration, beauty shot, selfie, idol';

  if (isFlowerScene) {
    return {
      positive: 'flowers only scene, botanical objects only, no characters, no faces, no animals',
      negative: `${antiAnimeNegative}, ${nonHumanNegative}, animals, creature, mascot`,
    };
  }

  return {
    positive: 'non-human subject only, no human characters, no face close-up',
    negative: `${antiAnimeNegative}, ${nonHumanNegative}`,
  };
}

/**
 * Base workflow negatifi (ör. tek hayvan portresi için tasarlanmış "flowers, grass, plants,
 * background, scenery" gibi terimler) konuyla çelişiyorsa bu terimleri kaldırır. Aksi halde
 * model aynı anda hem çizmeye hem çizmemeye zorlanır (ör. "Çiçek bahçesi" konusu + bu negatifler).
 */
function stripConflictingNegativeTerms(baseNegative: string, subjectText: string) {
  const lower = subjectText.toLowerCase();
  const conflictGroups: Array<{ test: RegExp; terms: string[] }> = [
    {
      test: /çiçek|flower|garden|bahçe|bitki|plant/,
      terms: ['background', 'scenery', 'landscape', 'jungle', 'forest', 'flowers', 'grass', 'plants', 'trees', 'mountains', 'clouds', 'sun'],
    },
  ];
  const activeTerms = conflictGroups.filter((group) => group.test.test(lower)).flatMap((group) => group.terms);
  if (!activeTerms.length) return baseNegative;

  return baseNegative
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term && !activeTerms.includes(term.toLowerCase()))
    .join(', ');
}

export class LocalSdxlImageProvider implements ImageProvider {
  private backend: LocalBackend | null = null;
  private comfyTemplate: ComfyWorkflow | null = null;

  private get baseUrl() {
    return config.localImageApiUrl.replace(/\/$/, '');
  }

  private async detectBackend() {
    if (this.backend) return this.backend;

    try {
      const health = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (health.ok) {
        this.backend = 'local-ai';
        return this.backend;
      }
    } catch {
      // Try ComfyUI probe next.
    }

    try {
      const comfy = await fetch(`${this.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(4000),
      });
      if (comfy.ok) {
        this.backend = 'comfyui';
        return this.backend;
      }
    } catch {
      // Error is surfaced by caller.
    }

    throw new Error('Yerel görsel servisi algılanamadı. LOCAL_IMAGE_API_URL değerini kontrol edin.');
  }

  private resolveWorkflowPath() {
    const configured = process.env.COMFYUI_WORKFLOW_PATH?.trim();
    return resolve(configured || DEFAULT_WORKFLOW_FILE);
  }

  private loadComfyTemplate() {
    if (this.comfyTemplate) return this.comfyTemplate;

    const workflowPath = this.resolveWorkflowPath();
    if (!existsSync(workflowPath)) {
      throw new Error(`ComfyUI workflow dosyası bulunamadı: ${workflowPath}`);
    }
    const raw = readFileSync(workflowPath, 'utf-8');
    const parsed = JSON.parse(raw) as ComfyWorkflow;
    if (!parsed || typeof parsed !== 'object' || !Object.keys(parsed).length) {
      throw new Error('ComfyUI workflow şablonu boş veya geçersiz.');
    }
    this.comfyTemplate = parsed;
    return parsed;
  }

  private pickSamplerNode(workflow: ComfyWorkflow) {
    return Object.entries(workflow).find(([, node]) => (node.class_type || '').startsWith('KSampler'));
  }

  private pickClipNode(workflow: ComfyWorkflow, fallbackKey?: string, expected: 'positive' | 'negative' = 'positive') {
    if (fallbackKey && workflow[fallbackKey]?.class_type === 'CLIPTextEncode') return [fallbackKey, workflow[fallbackKey]] as const;
    const token = expected === 'positive' ? 'pozitif|positive' : 'negatif|negative';
    const byTitle = Object.entries(workflow).find(([, node]) => node.class_type === 'CLIPTextEncode' && new RegExp(token, 'i').test(node._meta?.title || ''));
    if (byTitle) return byTitle;
    return Object.entries(workflow).find(([, node]) => node.class_type === 'CLIPTextEncode');
  }

  private async uploadReferenceImageToComfy(imageUrl: string) {
    try {
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
      if (!imageResponse.ok) return null;
      const buffer = Buffer.from(await imageResponse.arrayBuffer());

      const form = new FormData();
      form.append('image', new Blob([buffer], { type: 'image/png' }), `reference-${randomUUID()}.png`);
      form.append('overwrite', 'true');

      const uploadResponse = await fetch(`${this.baseUrl}/upload/image`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(20_000),
      });
      if (!uploadResponse.ok) return null;
      const uploaded = await uploadResponse.json() as { name?: string };
      return uploaded.name || null;
    } catch {
      return null;
    }
  }

  private wireControlNet(workflow: ComfyWorkflow, uploadedFilename: string, positiveKey: string, negativeKey: string) {
    const samplerEntry = this.pickSamplerNode(workflow);
    if (!samplerEntry) return;
    const [samplerKey, samplerNode] = samplerEntry;

    workflow.controlnetRefImage = { class_type: 'LoadImage', inputs: { image: uploadedFilename }, _meta: { title: 'Onaylı Referans Görsel' } };
    workflow.controlnetCanny = {
      class_type: 'Canny',
      inputs: { image: ['controlnetRefImage', 0], low_threshold: 0.4, high_threshold: 0.8 },
      _meta: { title: 'Kenar Tespiti' },
    };
    workflow.controlnetLoader = {
      class_type: 'ControlNetLoader',
      inputs: { control_net_name: config.comfyControlNetModel },
      _meta: { title: 'ControlNet Yükle' },
    };
    workflow.controlnetApply = {
      class_type: 'ControlNetApplyAdvanced',
      inputs: {
        positive: [positiveKey, 0],
        negative: [negativeKey, 0],
        control_net: ['controlnetLoader', 0],
        image: ['controlnetCanny', 0],
        strength: config.comfyControlNetStrength,
        start_percent: 0,
        end_percent: 1,
      },
      _meta: { title: 'ControlNet Uygula' },
    };

    samplerNode.inputs = {
      ...(samplerNode.inputs || {}),
      positive: ['controlnetApply', 0],
      negative: ['controlnetApply', 1],
    };
    workflow[samplerKey] = samplerNode;
  }

  private async buildComfyWorkflow(request: ProviderGenerationRequest) {
    const template = this.loadComfyTemplate();
    const workflow = JSON.parse(JSON.stringify(template)) as ComfyWorkflow;
    const promptParts = splitPromptForComfy(request.prompt);

    const samplerEntry = this.pickSamplerNode(workflow);
    const samplerNode = samplerEntry?.[1];

    const positiveRef = Array.isArray(samplerNode?.inputs?.positive) ? samplerNode?.inputs?.positive as [string, number] : undefined;
    const negativeRef = Array.isArray(samplerNode?.inputs?.negative) ? samplerNode?.inputs?.negative as [string, number] : undefined;

    const positiveEntry = this.pickClipNode(workflow, positiveRef?.[0], 'positive');
    const negativeEntry = this.pickClipNode(workflow, negativeRef?.[0], 'negative');
    let finalPositive = '';
    let finalNegative = '';
    const subjectText = promptParts.positive || request.prompt;
    const guards = buildPromptGuards(subjectText);

    if (positiveEntry) {
      const basePositive = String(positiveEntry[1].inputs?.text || '').trim();
      finalPositive = injectSubjectIntoPositive(basePositive, subjectText);
      positiveEntry[1].inputs = {
        ...(positiveEntry[1].inputs || {}),
        text: `${finalPositive}, ${guards.positive}`,
      };
    }

    if (negativeEntry) {
      const baseNegative = stripConflictingNegativeTerms(String(negativeEntry[1].inputs?.text || '').trim(), subjectText);
      const mergedNegative = promptParts.negative
        ? `${guards.negative}, ${baseNegative}, ${promptParts.negative}`
        : `${guards.negative}, ${baseNegative}`;
      finalNegative = mergedNegative;
      negativeEntry[1].inputs = {
        ...(negativeEntry[1].inputs || {}),
        text: mergedNegative,
      };
    }

    if (config.comfyControlNetEnabled && positiveEntry && negativeEntry) {
      const referenceImageUrl = await findApprovedReferenceImage(subjectText).catch(() => null);
      const uploadedFilename = referenceImageUrl ? await this.uploadReferenceImageToComfy(referenceImageUrl) : null;
      if (uploadedFilename) {
        this.wireControlNet(workflow, uploadedFilename, positiveEntry[0], negativeEntry[0]);
      }
      if (process.env.COMFYUI_DEBUG_PROMPTS === 'true') {
        console.info('Comfy controlnet reference', { referenceImageUrl, uploadedFilename });
      }
    }

    if (process.env.COMFYUI_DEBUG_PROMPTS === 'true') {
      console.info('Comfy prompt debug', {
        positive: shortenForLog(finalPositive || subjectText),
        negative: shortenForLog(finalNegative),
      });
    }

    return workflow;
  }

  private async generateViaComfyUi(request: ProviderGenerationRequest) {
    const workflow = await this.buildComfyWorkflow(request);
    const enqueue = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: randomUUID() }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!enqueue.ok) {
      const detail = await enqueue.text();
      throw new Error(`ComfyUI istek kuyruğu başarısız (${enqueue.status}): ${detail.slice(0, 300)}`);
    }

    const queued = await enqueue.json() as { prompt_id?: string };
    if (!queued.prompt_id) throw new Error('ComfyUI prompt_id döndürmedi.');

    const timeoutAt = Date.now() + REQUEST_TIMEOUT_MS;
    while (Date.now() < timeoutAt) {
      const historyResponse = await fetch(`${this.baseUrl}/history/${queued.prompt_id}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (historyResponse.ok) {
        const history = await historyResponse.json() as ComfyHistoryResponse;
        const outputs = history?.[queued.prompt_id]?.outputs;
        if (outputs) {
          const image = Object.values(outputs)
            .flatMap((node) => node.images || [])
            .find((item) => item.filename);
          if (image?.filename) {
            const imageUrl = new URL(`${this.baseUrl}/view`);
            imageUrl.searchParams.set('filename', image.filename);
            imageUrl.searchParams.set('subfolder', image.subfolder || '');
            imageUrl.searchParams.set('type', image.type || 'output');

            const imageResponse = await fetch(imageUrl, {
              signal: AbortSignal.timeout(20_000),
            });
            if (!imageResponse.ok) {
              const detail = await imageResponse.text();
              throw new Error(`ComfyUI görseli alınamadı (${imageResponse.status}): ${detail.slice(0, 300)}`);
            }
            return {
              buffer: Buffer.from(await imageResponse.arrayBuffer()),
              mimeType: 'image/png' as const,
              model: 'comfyui-sdxl',
            };
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error('ComfyUI üretimi zaman aşımına uğradı.');
  }

  async validateConnection() {
    const backend = await this.detectBackend();

    if (backend === 'comfyui') {
      try {
        const response = await fetch(`${this.baseUrl}/system_stats`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const stats = await response.json() as { devices?: Array<{ name?: string }> };
        return {
          valid: true,
          message: `ComfyUI hazır (${stats.devices?.[0]?.name || 'localhost:8188'}).`,
        };
      } catch {
        return { valid: false, message: 'ComfyUI servisine ulaşılamadı. LOCAL_IMAGE_API_URL değerini kontrol edin.' };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = await response.json() as { ready?: boolean; device?: string };
      return {
        valid: status.ready === true,
        message: status.ready
          ? `Yerel SDXL servisi hazır (${status.device || 'Apple Silicon'}).`
          : 'Yerel SDXL servisi modeli yüklemeye hazır değil.',
      };
    } catch {
      return { valid: false, message: 'Yerel SDXL servisine ulaşılamadı. Önce npm run local-ai:start komutunu çalıştırın veya LOCAL_IMAGE_API_URL ile ComfyUI adresini verin.' };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const backend = await this.detectBackend();
    if (backend === 'comfyui') return this.generateViaComfyUi(request);

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt, orientation: request.orientation }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Yerel SDXL üretimi başarısız (${response.status}): ${detail.slice(0, 300)}`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: 'sdxl-lightning-coloringbook',
    };
  }

  normalizeError(error: unknown) {
    return error instanceof Error ? error : new Error('Yerel SDXL isteği başarısız.');
  }
}
