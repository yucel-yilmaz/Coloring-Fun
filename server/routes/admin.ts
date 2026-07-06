import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, HttpError } from '../http';
import { requireAdmin, requireAuth, requireStaff } from '../middleware/auth';
import { attachAssetUrls } from '../services/assets';
import { validateTemplate } from '../services/skills';
import { requireSupabase } from '../supabase';
import { reviewSchema } from '../validation';

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get('/reviews', requireStaff, asyncRoute(async (_req, res) => {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('publication_submissions')
    .select('*, artworks(*)').in('status', ['submitted', 'under_review']).order('submitted_at');
  if (error) throw error;
  const result = await Promise.all((data || []).map(async (submission) => {
    const artwork = Array.isArray(submission.artworks) ? submission.artworks[0] : submission.artworks;
    if (!artwork) return { ...submission, artwork: null, context: null, artworks: undefined };
    const [{ data: job }, { data: automaticReview }, { data: processedAsset }] = await Promise.all([
      artwork.generation_job_id
        ? supabase.from('generation_jobs').select('compiled_prompt, skill_snapshot, model, provider').eq('id', artwork.generation_job_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('moderation_reviews').select('details, decision').eq('artwork_id', artwork.id).eq('kind', 'automatic').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('artwork_assets').select('sha256').eq('artwork_id', artwork.id).eq('kind', 'processed').maybeSingle(),
    ]);
    let duplicateCount = 0;
    if (processedAsset?.sha256) {
      const { count } = await supabase.from('artwork_assets').select('id', { count: 'exact', head: true }).eq('kind', 'processed').eq('sha256', processedAsset.sha256).neq('artwork_id', artwork.id);
      duplicateCount = count || 0;
    }
    return {
      ...submission,
      artwork: (await attachAssetUrls([artwork]))[0],
      context: { prompt: job?.compiled_prompt || '', model: job?.model, provider: job?.provider, skillSnapshot: job?.skill_snapshot, qualityScore: automaticReview?.details?.qualityScore, duplicateCount },
      artworks: undefined,
    };
  }));
  res.json(result);
}));

adminRouter.post('/reviews/:id/decision', requireStaff, asyncRoute(async (req, res) => {
  const input = reviewSchema.parse(req.body);
  const supabase = requireSupabase();
  const { data: submission } = await supabase.from('publication_submissions').select('*, artworks(*)').eq('id', req.params.id).single();
  if (!submission) throw new HttpError(404, 'SUBMISSION_NOT_FOUND', 'İnceleme kaydı bulunamadı.');
  const artwork = Array.isArray(submission.artworks) ? submission.artworks[0] : submission.artworks;
  const nextStatus = input.decision === 'approve' ? 'published' : input.decision === 'reject' ? 'rejected' : 'changes_requested';

  if (input.decision === 'approve') {
    const { data: assets } = await supabase.from('artwork_assets').select('*').eq('artwork_id', artwork.id).in('kind', ['processed', 'thumbnail', 'mask']);
    for (const asset of assets || []) {
      if (asset.bucket === 'public-artworks') continue;
      const { data: downloaded, error: downloadError } = await supabase.storage.from(asset.bucket).download(asset.storage_path);
      if (downloadError || !downloaded) throw downloadError;
      const publicPath = `${artwork.id}/${asset.kind}-${randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from('public-artworks').upload(publicPath, downloaded, { contentType: asset.mime_type, upsert: true });
      if (uploadError) throw uploadError;
      await supabase.from('artwork_assets').update({ bucket: 'public-artworks', storage_path: publicPath }).eq('id', asset.id);
    }
  }

  await Promise.all([
    supabase.from('publication_submissions').update({ status: nextStatus, decided_at: new Date().toISOString() }).eq('id', submission.id),
    supabase.from('artworks').update({ status: nextStatus, published_at: nextStatus === 'published' ? new Date().toISOString() : null }).eq('id', artwork.id),
    supabase.from('moderation_reviews').insert({ submission_id: submission.id, artwork_id: artwork.id, reviewer_id: req.user!.id, kind: 'manual', decision: input.decision, reason_code: input.reasonCode, note: input.note }),
    supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: `artwork.${input.decision}`, entity_type: 'artwork', entity_id: artwork.id }),
  ]);
  res.json({ status: nextStatus });
}));

adminRouter.get('/skills', requireAdmin, asyncRoute(async (_req, res) => {
  const { data, error } = await requireSupabase().from('ai_skills').select('*, ai_skill_versions!ai_skill_versions_skill_id_fkey(*)').order('name');
  if (error) throw error;
  res.json(data);
}));

adminRouter.get('/skills/:slug/versions', requireAdmin, asyncRoute(async (req, res) => {
  const { data: skill } = await requireSupabase().from('ai_skills').select('id, slug, name, active_version_id').eq('slug', req.params.slug).single();
  if (!skill) throw new HttpError(404, 'SKILL_NOT_FOUND', 'Skill bulunamadı.');
  const { data, error } = await requireSupabase().from('ai_skill_versions').select('*').eq('skill_id', skill.id).order('version', { ascending: false });
  if (error) throw error;
  res.json({ skill, versions: data });
}));

adminRouter.post('/skills/:slug/versions', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    systemTemplate: z.string().min(20).max(10_000), negativeTemplate: z.string().max(5_000).default(''),
    providerOverrides: z.record(z.string(), z.unknown()).default({}), qualityRules: z.record(z.string(), z.unknown()).default({ minimumScore: 75, maxRetries: 1 }),
    changeNote: z.string().min(3).max(300),
  }).parse(req.body);
  validateTemplate(`${input.systemTemplate}\n${input.negativeTemplate}`);
  const supabase = requireSupabase();
  const { data: skill } = await supabase.from('ai_skills').select('id').eq('slug', req.params.slug).single();
  if (!skill) throw new HttpError(404, 'SKILL_NOT_FOUND', 'Skill bulunamadı.');
  const { data: latest } = await supabase.from('ai_skill_versions').select('version').eq('skill_id', skill.id).order('version', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('ai_skill_versions').insert({
    skill_id: skill.id, version: (latest?.version || 0) + 1, system_template: input.systemTemplate,
    negative_template: input.negativeTemplate, provider_overrides: input.providerOverrides,
    quality_rules: input.qualityRules, change_note: input.changeNote, created_by: req.user!.id,
  }).select('*').single();
  if (error) throw error;
  res.status(201).json(data);
}));

adminRouter.post('/skills/:slug/test', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    template: z.string().min(20),
    values: z.record(z.string(), z.string()),
    providerConnectionId: z.string().uuid().optional(),
    childProfileId: z.string().uuid().optional(),
  }).parse(req.body);
  validateTemplate(input.template);
  const Mustache = (await import('mustache')).default;
  const compiledPrompt = Mustache.render(input.template, input.values);
  let jobId: string | undefined;
  if (input.providerConnectionId && input.childProfileId) {
    const supabase = requireSupabase();
    const [{ data: connection }, { data: child }] = await Promise.all([
      supabase.from('ai_connections').select('id, provider, model, status').eq('id', input.providerConnectionId).eq('user_id', req.user!.id).single(),
      supabase.from('child_profiles').select('id, age_band').eq('id', input.childProfileId).eq('parent_id', req.user!.id).single(),
    ]);
    if (!connection || connection.status !== 'ready' || !child) throw new HttpError(409, 'TEST_SETUP_REQUIRED', 'Test üretimi için hazır AI bağlantısı ve çocuk profili gerekiyor.');
    const request = { childProfileId: child.id, providerConnectionId: connection.id, subjectPreset: input.values.subject || 'Sevimli aslan', customIdea: input.values.customIdea || '', ageBand: input.values.ageBand || child.age_band, difficulty: input.values.difficulty || 'easy', sceneDensity: input.values.sceneDensity || 'simple-scene', lineWeight: input.values.lineWeight || 'thick', orientation: 'portrait' };
    const { data: job, error } = await supabase.from('generation_jobs').insert({ user_id: req.user!.id, child_profile_id: child.id, connection_id: connection.id, provider: connection.provider, model: connection.model, request, skill_snapshot: { test: true, slug: req.params.slug }, compiled_prompt: compiledPrompt }).select('id').single();
    if (error) throw error;
    jobId = job.id;
  }
  res.json({ compiledPrompt, valid: true, jobId });
}));

adminRouter.post('/skills/:slug/publish', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({ versionId: z.string().uuid() }).parse(req.body);
  const supabase = requireSupabase();
  const { data: skill } = await supabase.from('ai_skills').select('id').eq('slug', req.params.slug).single();
  if (!skill) throw new HttpError(404, 'SKILL_NOT_FOUND', 'Skill bulunamadı.');
  const { error } = await supabase.rpc('publish_skill_version', { p_skill_id: skill.id, p_version_id: input.versionId, p_actor_id: req.user!.id });
  if (error) throw error;
  res.json({ published: true, versionId: input.versionId });
}));

adminRouter.post('/skills/:slug/rollback', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({ versionId: z.string().uuid() }).parse(req.body);
  const supabase = requireSupabase();
  const { data: skill } = await supabase.from('ai_skills').select('id').eq('slug', req.params.slug).single();
  if (!skill) throw new HttpError(404, 'SKILL_NOT_FOUND', 'Skill bulunamadı.');
  const { error } = await supabase.rpc('publish_skill_version', { p_skill_id: skill.id, p_version_id: input.versionId, p_actor_id: req.user!.id });
  if (error) throw error;
  res.json({ rolledBack: true, versionId: input.versionId });
}));
