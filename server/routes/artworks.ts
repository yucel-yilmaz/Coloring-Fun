import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, HttpError } from '../http';
import { requireAuth } from '../middleware/auth';
import { attachAssetUrls, deleteArtworkWithAssets } from '../services/assets';
import { requireSupabase } from '../supabase';
import { submitArtworkSchema } from '../validation';

export const artworksRouter = Router();

async function privatizeArtworkAssets(artworkId: string, ownerId: string) {
  const supabase = requireSupabase();
  const { data: assets } = await supabase.from('artwork_assets').select('*').eq('artwork_id', artworkId).eq('bucket', 'public-artworks');
  for (const asset of assets || []) {
    const { data: file, error: downloadError } = await supabase.storage.from('public-artworks').download(asset.storage_path);
    if (downloadError || !file) throw downloadError;
    const privatePath = `${ownerId}/${artworkId}/${asset.kind}-${randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from('private-artworks').upload(privatePath, file, { contentType: asset.mime_type });
    if (uploadError) throw uploadError;
    await supabase.storage.from('public-artworks').remove([asset.storage_path]);
    await supabase.from('artwork_assets').update({ bucket: 'private-artworks', storage_path: privatePath }).eq('id', asset.id);
  }
}

artworksRouter.get('/public', asyncRoute(async (_req, res) => {
  const { data, error } = await requireSupabase().from('artworks').select('*').eq('status', 'published').order('published_at', { ascending: false });
  if (error) throw error;
  res.json(await attachAssetUrls(data || []));
}));

artworksRouter.use(requireAuth);
artworksRouter.get('/', asyncRoute(async (req, res) => {
  const scope = String(req.query.scope || 'private');
  let query = requireSupabase().from('artworks').select('*').order('created_at', { ascending: false });
  if (scope === 'published') query = query.eq('status', 'published');
  else query = query.eq('owner_id', req.user!.id);
  const { data, error } = await query;
  if (error) throw error;
  res.json(await attachAssetUrls(data || []));
}));

artworksRouter.post('/colored', asyncRoute(async (req, res) => {
  const input = z.object({ title: z.string().trim().min(1).max(100), imageDataUrl: z.string().startsWith('data:image/png;base64,'), sourceArtworkId: z.string().uuid().optional() }).parse(req.body);
  const base64 = input.imageDataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 12 * 1024 * 1024) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Boyama dosyası çok büyük.');
  const supabase = requireSupabase();
  const { data: usageRows } = await supabase.from('artwork_assets').select('byte_size, artworks!inner(owner_id)').eq('artworks.owner_id', req.user!.id);
  const usedBytes = (usageRows || []).reduce((total, row) => total + Number(row.byte_size || 0), 0);
  if (usedBytes + buffer.length > 500 * 1024 * 1024) throw new HttpError(413, 'STORAGE_LIMIT', '500 MB depolama sınırına ulaştınız.');
  const { data: artwork, error } = await supabase.from('artworks').insert({
    owner_id: req.user!.id, title: input.title, subject: input.sourceArtworkId || '', category: 'animals', source: 'colored', status: 'private',
  }).select('*').single();
  if (error) throw error;
  const path = `${req.user!.id}/${artwork.id}/${randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage.from('private-artworks').upload(path, buffer, { contentType: 'image/png' });
  if (uploadError) throw uploadError;
  await supabase.from('artwork_assets').insert({ artwork_id: artwork.id, kind: 'colored', bucket: 'private-artworks', storage_path: path, mime_type: 'image/png', byte_size: buffer.length });
  res.status(201).json((await attachAssetUrls([artwork]))[0]);
}));

artworksRouter.post('/:id/submit', asyncRoute(async (req, res) => {
  const input = submitArtworkSchema.parse(req.body);
  const supabase = requireSupabase();
  const { data: artwork } = await supabase.from('artworks').select('*').eq('id', req.params.id).eq('owner_id', req.user!.id).eq('source', 'generated').in('status', ['private', 'changes_requested', 'rejected', 'withdrawn']).single();
  if (!artwork) throw new HttpError(409, 'NOT_SUBMITTABLE', 'Bu çalışma yayın incelemesine gönderilemez.');
  const { data: submission, error } = await supabase.from('publication_submissions').insert({ artwork_id: artwork.id, submitted_by: req.user!.id, rights_confirmed: true, status: 'submitted' }).select('*').single();
  if (error) throw error;
  await supabase.from('artworks').update({ title: input.title, category: input.category, status: 'submitted' }).eq('id', artwork.id);
  res.status(201).json(submission);
}));

artworksRouter.post('/:id/withdraw', asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const { data: current } = await supabase.from('artworks').select('id, status').eq('id', req.params.id).eq('owner_id', req.user!.id).single();
  if (!current) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Çalışma bulunamadı.');
  if (current.status === 'published') await privatizeArtworkAssets(current.id, req.user!.id);
  const { data, error } = await supabase.from('artworks').update({ status: 'withdrawn', published_at: null }).eq('id', req.params.id).eq('owner_id', req.user!.id).select('*').single();
  if (error || !data) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Çalışma bulunamadı.');
  res.json(data);
}));

artworksRouter.post('/:id/report', asyncRoute(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body);
  const supabase = requireSupabase();
  const { error } = await supabase.from('reports').upsert({ artwork_id: req.params.id, reporter_id: req.user!.id, reason: input.reason }, { onConflict: 'artwork_id,reporter_id' });
  if (error) throw error;
  const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('artwork_id', req.params.id);
  if ((count || 0) >= 3) {
    const { data: artwork } = await supabase.from('artworks').select('id, owner_id, status').eq('id', req.params.id).single();
    if (artwork?.status === 'published') {
      await privatizeArtworkAssets(artwork.id, artwork.owner_id);
      await supabase.from('artworks').update({ status: 'taken_down', published_at: null }).eq('id', req.params.id);
    }
  }
  res.status(201).json({ reported: true });
}));

artworksRouter.delete('/:id', asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const { data: artwork } = await supabase.from('artworks').select('id').eq('id', req.params.id).eq('owner_id', req.user!.id).single();
  if (!artwork) throw new HttpError(404, 'ARTWORK_NOT_FOUND', 'Çalışma bulunamadı.');
  await deleteArtworkWithAssets(artwork.id);
  res.status(204).end();
}));
