import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, HttpError } from '../http';
import { requireAdmin, requireAuth, requireStaff } from '../middleware/auth';
import { attachAssetUrls, deleteArtworkWithAssets, publicStorageUrl } from '../services/assets';
import { getCatalogPages } from '../services/catalog';
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

const artworkUpdateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  subject: z.string().trim().max(160).default(''),
  category: z.enum(['animals', 'dinos', 'vehicles', 'people', 'places', 'space']),
  ageBand: z.enum(['3-5', '6-8', '9-12']).nullable(),
  difficulty: z.enum(['easy', 'medium', 'detailed']).nullable(),
  status: z.enum(['private', 'submitted', 'under_review', 'published', 'rejected', 'changes_requested', 'withdrawn', 'taken_down', 'archived']),
});
const catalogUpdateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  category: z.enum(['animals', 'dinos', 'vehicles', 'people', 'places', 'space']),
});
const imageUrlSchema = z.string().trim().min(1).max(2_000).refine((value) => {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}, 'Geçerli bir görsel URL girin.');
const catalogCreateSchema = catalogUpdateSchema.extend({
  lineArtUrl: imageUrlSchema.optional(),
  imageDataUrl: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/).optional(),
}).refine((value) => Boolean(value.lineArtUrl || value.imageDataUrl), {
  message: 'Görsel URL veya bilgisayardan dosya seçin.',
});

function decodeCatalogImage(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) throw new HttpError(400, 'INVALID_IMAGE', 'PNG, JPG veya WEBP görsel yükleyin.');
  const mimeSubtype = match[1] === 'jpg' ? 'jpeg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 12 * 1024 * 1024) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Görsel dosyası çok büyük.');
  return { buffer, mimeType: `image/${mimeSubtype}`, extension: mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype };
}

adminRouter.get('/coloring-pages', requireAdmin, asyncRoute(async (_req, res) => {
  res.json((await getCatalogPages()).filter((item) => !item.hidden));
}));

adminRouter.post('/coloring-pages', requireAdmin, asyncRoute(async (req, res) => {
  const input = catalogCreateSchema.parse(req.body);
  const idBase = input.title
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'sayfa';
  const pageId = `custom-${idBase}-${randomUUID().slice(0, 8)}`;
  const supabase = requireSupabase();
  let lineArtUrl = input.lineArtUrl;
  if (input.imageDataUrl) {
    const image = decodeCatalogImage(input.imageDataUrl);
    const storagePath = `catalog/${pageId}.${image.extension}`;
    const { error: uploadError } = await supabase.storage.from('public-artworks').upload(storagePath, image.buffer, { contentType: image.mimeType, upsert: true });
    if (uploadError) throw uploadError;
    lineArtUrl = publicStorageUrl(supabase.storage.from('public-artworks').getPublicUrl(storagePath).data.publicUrl);
  }
  const { error } = await supabase.from('coloring_page_overrides').insert({
    page_id: pageId,
    title: input.title,
    category: input.category,
    line_art_url: lineArtUrl,
    hidden: false,
    updated_by: req.user!.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: req.user!.id,
    action: 'catalog.create',
    entity_type: 'coloring_page',
    entity_id: pageId,
    metadata: { title: input.title, category: input.category, lineArtUrl, upload: Boolean(input.imageDataUrl) },
  });
  const page = (await getCatalogPages()).find((item) => item.id === pageId);
  res.status(201).json(page);
}));

adminRouter.patch('/coloring-pages/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = catalogUpdateSchema.parse(req.body);
  const page = (await getCatalogPages()).find((item) => item.id === req.params.id);
  if (!page) throw new HttpError(404, 'COLORING_PAGE_NOT_FOUND', 'Boyama sayfası bulunamadı.');
  const supabase = requireSupabase();
  const { error } = await supabase.from('coloring_page_overrides').upsert({
    page_id: req.params.id,
    title: input.title,
    category: input.category,
    line_art_url: page.lineArtUrl,
    hidden: false,
    updated_by: req.user!.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'page_id' });
  if (error) throw error;
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'catalog.update', entity_type: 'coloring_page', entity_id: req.params.id, metadata: input });
  res.json({ ...page, title: input.title, name: input.title, nameTr: input.title, category: input.category, hidden: false });
}));

adminRouter.delete('/coloring-pages/:id', requireAdmin, asyncRoute(async (req, res) => {
  const page = (await getCatalogPages()).find((item) => item.id === req.params.id);
  if (!page) throw new HttpError(404, 'COLORING_PAGE_NOT_FOUND', 'Boyama sayfası bulunamadı.');
  const supabase = requireSupabase();
  const { error } = await supabase.from('coloring_page_overrides').upsert({
    page_id: req.params.id,
    title: page.title,
    category: page.category,
    line_art_url: page.lineArtUrl,
    hidden: true,
    updated_by: req.user!.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'page_id' });
  if (error) throw error;
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'catalog.delete', entity_type: 'coloring_page', entity_id: req.params.id });
  res.status(204).end();
}));

adminRouter.get('/artworks', requireAdmin, asyncRoute(async (req, res) => {
  const status = String(req.query.status || 'all');
  const search = String(req.query.search || '').trim().replace(/[,%()]/g, ' ');
  let query = requireSupabase().from('artworks').select('*').order('created_at', { ascending: false }).limit(120);
  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  res.json(await attachAssetUrls(data || []));
}));

adminRouter.patch('/artworks/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = artworkUpdateSchema.parse(req.body);
  const supabase = requireSupabase();
  const { data: current } = await supabase.from('artworks').select('id').eq('id', req.params.id).single();
  if (!current) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Görsel bulunamadı.');
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null;
  const { data, error } = await supabase.from('artworks').update({
    title: input.title,
    subject: input.subject,
    category: input.category,
    age_band: input.ageBand,
    difficulty: input.difficulty,
    status: input.status,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  }).eq('id', req.params.id).select('*').single();
  if (error || !data) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Görsel bulunamadı.');
  await supabase.from('publication_submissions').update({
    status: input.status,
    decided_at: ['published', 'rejected', 'changes_requested', 'taken_down', 'withdrawn'].includes(input.status) ? new Date().toISOString() : null,
  }).eq('artwork_id', req.params.id);
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'artwork.update', entity_type: 'artwork', entity_id: req.params.id, metadata: input });
  res.json((await attachAssetUrls([data]))[0]);
}));

adminRouter.delete('/artworks/:id', requireAdmin, asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const { data: artwork } = await supabase.from('artworks').select('id').eq('id', req.params.id).single();
  if (!artwork) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Görsel bulunamadı.');
  await deleteArtworkWithAssets(artwork.id);
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'artwork.delete', entity_type: 'artwork', entity_id: req.params.id });
  res.status(204).end();
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
