import { Router } from 'express';
import { config } from '../config';
import { asyncRoute, HttpError } from '../http';
import { requireAuth } from '../middleware/auth';
import { moderateText } from '../services/moderation';
import { compileGenerationPrompt } from '../services/skills';
import { requireSupabase } from '../supabase';
import { generationSchema } from '../validation';

export const generationsRouter = Router();
generationsRouter.use(requireAuth);

generationsRouter.post('/', asyncRoute(async (req, res) => {
  const input = generationSchema.parse(req.body);
  const supabase = requireSupabase();
  const [{ data: child }, { data: connection }, { count: activeCount }, { count: dailyCount }] = await Promise.all([
    supabase.from('child_profiles').select('id, age_band').eq('id', input.childProfileId).eq('parent_id', req.user!.id).single(),
    supabase.from('ai_connections').select('id, provider, model, status').eq('id', input.providerConnectionId).eq('user_id', req.user!.id).single(),
    supabase.from('generation_jobs').select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id).not('status', 'in', '(completed,failed,blocked,cancelled)'),
    supabase.from('generation_jobs').select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id).eq('status', 'completed').gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if (!child) throw new HttpError(404, 'CHILD_NOT_FOUND', 'Çocuk profili bulunamadı.');
  if (!connection || connection.status !== 'ready') throw new HttpError(409, 'CONNECTION_NOT_READY', 'AI bağlantısı hazır değil.');
  if ((activeCount || 0) >= 2) throw new HttpError(429, 'CONCURRENT_LIMIT', 'Aynı anda en fazla 2 üretim çalışabilir.');
  if ((dailyCount || 0) >= config.dailyGenerationLimit) {
    throw new HttpError(429, 'DAILY_LIMIT', `Günlük ${config.dailyGenerationLimit} üretim sınırına ulaştınız.`);
  }

  const moderation = await moderateText(`${input.subjectPreset}. ${input.customIdea}`);
  if (moderation.flagged) throw new HttpError(422, 'PROMPT_BLOCKED', 'Bu fikir çocuklara uygun güvenlik kurallarını karşılamıyor.');
  const compiled = await compileGenerationPrompt({
    ageBand: input.ageBand,
    subject: input.subjectPreset,
    customIdea: input.customIdea || 'No additional elements.',
    sceneDensity: input.sceneDensity,
    difficulty: input.difficulty,
    lineWeight: input.lineWeight,
  });
  const { data, error } = await supabase.from('generation_jobs').insert({
    user_id: req.user!.id,
    child_profile_id: input.childProfileId,
    connection_id: connection.id,
    provider: connection.provider,
    model: connection.model,
    request: input,
    skill_snapshot: compiled.snapshot,
    compiled_prompt: compiled.prompt,
  }).select('id, status, progress, created_at').single();
  if (error) throw error;
  res.status(202).json(data);
}));

generationsRouter.get('/:id', asyncRoute(async (req, res) => {
  const { data, error } = await requireSupabase().from('generation_jobs')
    .select('id, status, progress, artwork_id, error_code, error_message, created_at, updated_at')
    .eq('id', req.params.id).eq('user_id', req.user!.id).single();
  if (error || !data) throw new HttpError(404, 'JOB_NOT_FOUND', 'Üretim işi bulunamadı.');
  res.json(data);
}));

generationsRouter.post('/:id/cancel', asyncRoute(async (req, res) => {
  const { data, error } = await requireSupabase().from('generation_jobs').update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('user_id', req.user!.id).in('status', ['queued', 'prompt_moderation']).select('id, status').single();
  if (error || !data) throw new HttpError(409, 'CANNOT_CANCEL', 'Bu üretim artık iptal edilemez.');
  res.json(data);
}));
