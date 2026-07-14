import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { config } from './config';
import { createProvider } from './providers';
import { decryptSecret } from './security/crypto';
import { processLineArt } from './services/image-processing';
import { buildLocalImagePrompt, SUBJECTS } from './services/local-prompt';
import { moderateImage, moderateText } from './services/moderation';
import { translateToEnglish } from './services/translate';
import { requireSupabase } from './supabase';

const workerId = `${hostname()}-${process.pid}`;

// Community/open-weight models (often distilled "lightning"/"schnell" few-step variants) follow
// short English prompts far more reliably than the full multi-skill compiled prompt, which can run
// past 200 words and is frequently in Turkish. OpenAI and Gemini handle that prompt fine as-is.
const SHORT_PROMPT_PROVIDERS = new Set(['local_sdxl', 'fal', 'huggingface', 'replicate', 'stability']);

async function updateJob(id: string, payload: Record<string, unknown>) {
  await requireSupabase().from('generation_jobs').update({ ...payload, updated_at: new Date().toISOString(), lease_until: new Date(Date.now() + 300_000).toISOString() }).eq('id', id);
}

async function processJob(job: any) {
  const supabase = requireSupabase();
  try {
    await updateJob(job.id, { status: 'prompt_moderation', progress: 10 });
    const textModeration = await moderateText(`${job.request.subjectPreset}. ${job.request.customIdea || ''}`);
    if (textModeration.flagged) {
      await updateJob(job.id, {
        status: 'blocked',
        progress: 100,
        error_code: 'PROMPT_BLOCKED',
        error_message: 'Bu fikir çocuklara uygun güvenlik kurallarını karşılamıyor. Fikri değiştirip yeniden deneyin.',
        lease_until: null,
      });
      return;
    }
    const { data: connection, error } = await supabase.from('ai_connections').select('*').eq('id', job.connection_id).eq('user_id', job.user_id).single();
    if (error || !connection) throw new Error('AI bağlantısı bulunamadı.');
    const provider = createProvider(connection.provider, decryptSecret(connection));
    const useShortPrompt = SHORT_PROMPT_PROVIDERS.has(connection.provider);
    const rawSubject = job.request.subjectPreset || '';
    const shortPromptRequest = useShortPrompt
      ? { ...job.request, subjectPreset: SUBJECTS[rawSubject] ? rawSubject : await translateToEnglish(rawSubject) }
      : job.request;
    let quality: Awaited<ReturnType<typeof processLineArt>> | null = null;
    let source: Buffer | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await updateJob(job.id, { status: 'generating', progress: 25, attempt_count: attempt + 1 });
      const providerPrompt = useShortPrompt
        ? buildLocalImagePrompt(shortPromptRequest)
        : job.compiled_prompt;
      const correction = useShortPrompt
        ? ' Use fewer lines. Keep exactly one character, one head, and one face only. Make every coloring area large, white, and fully enclosed by an unbroken outline. Remove extra/duplicate faces, parent-child compositions, solid black fills, texture, shading, mane micro-lines, and tiny details.'
        : '\nÇizgileri kalınlaştır, tüm bölgeleri kapat ve sayfayı sadeleştir.';
      const result = await provider.generate({
        prompt: `${providerPrompt}${attempt ? correction : ''}`,
        model: job.model,
        orientation: job.request.orientation,
        userId: job.user_id,
      });
      source = result.buffer;
      await updateJob(job.id, { status: 'image_moderation', progress: 55 });
      const imageModeration = await moderateImage(source);
      if (imageModeration.flagged) {
        await updateJob(job.id, {
          status: 'blocked',
          progress: 100,
          error_code: 'IMAGE_BLOCKED',
          error_message: 'Üretilen görsel güvenlik kontrolünden geçemedi. Başka bir fikir deneyin.',
          lease_until: null,
        });
        return;
      }
      await updateJob(job.id, { status: 'processing', progress: 70 });
      quality = await processLineArt(source, job.request.orientation);
      console.info('Generation quality', {
        jobId: job.id,
        attempt: attempt + 1,
        score: quality.score,
        darkRatio: Number(quality.darkRatio.toFixed(3)),
        enclosedRegionCount: quality.enclosedRegionCount,
        enclosedWhiteRatio: Number(quality.enclosedWhiteRatio.toFixed(3)),
      });
      await updateJob(job.id, { status: 'quality_check', progress: 82 });
      if (quality.score >= Number(job.skill_snapshot?.qualityRules?.minimumScore || 75)) break;
    }
    if (!quality || !source || quality.score < 75) throw new Error('Görsel boyamaya uygun kapalı çizgi kalitesine ulaşamadı.');

    const { data: artwork, error: artworkError } = await supabase.from('artworks').insert({
      owner_id: job.user_id, child_profile_id: job.child_profile_id, title: job.request.subjectPreset,
      subject: job.request.subjectPreset, category: 'animals', age_band: job.request.ageBand,
      difficulty: job.request.difficulty, source: 'generated', status: 'private', generation_job_id: job.id,
    }).select('*').single();
    if (artworkError) throw artworkError;
    const root = `${job.user_id}/${artwork.id}`;
    const uploads = [
      { kind: 'source', bucket: 'private-sources', path: `${root}/source-${randomUUID()}.png`, data: source },
      { kind: 'processed', bucket: 'private-artworks', path: `${root}/line-${randomUUID()}.png`, data: quality.processed },
      { kind: 'mask', bucket: 'private-artworks', path: `${root}/mask-${randomUUID()}.png`, data: quality.mask },
      { kind: 'thumbnail', bucket: 'private-artworks', path: `${root}/thumb-${randomUUID()}.png`, data: quality.thumbnail },
    ];
    for (const asset of uploads) {
      const { error: uploadError } = await supabase.storage.from(asset.bucket).upload(asset.path, asset.data, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      await supabase.from('artwork_assets').insert({ artwork_id: artwork.id, kind: asset.kind, bucket: asset.bucket, storage_path: asset.path, mime_type: 'image/png', width: quality.width, height: quality.height, byte_size: asset.data.length, sha256: quality.sha256 });
    }
    await supabase.from('moderation_reviews').insert({ artwork_id: artwork.id, kind: 'automatic', decision: 'passed', details: { qualityScore: quality.score } });
    await updateJob(job.id, { status: 'completed', progress: 100, artwork_id: artwork.id, completed_at: new Date().toISOString(), lease_until: null });
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/(?:sk-|AIza)[A-Za-z0-9_-]+/g, '[GİZLİ]') : 'Üretim başarısız.';
    await updateJob(job.id, { status: 'failed', progress: 100, error_code: 'GENERATION_FAILED', error_message: message, lease_until: null });
  }
}

export async function runWorker() {
  console.log(`Coloring worker ready: ${workerId}`);
  while (true) {
    try {
      const { data, error } = await requireSupabase().rpc('claim_generation_job', { p_worker_id: workerId });
      if (error) throw error;
      if (data?.[0]) await processJob(data[0]);
      else await new Promise((resolve) => setTimeout(resolve, config.workerPollMs));
    } catch (error) {
      console.error('Worker poll failed', error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, Math.max(config.workerPollMs, 5000)));
    }
  }
}

if (process.argv[1]?.includes('worker')) runWorker();
