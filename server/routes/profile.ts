import { Router } from 'express';
import { asyncRoute } from '../http';
import { requireAuth } from '../middleware/auth';
import { requireSupabase } from '../supabase';

export const profileRouter = Router();
profileRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user!.id, email: req.user!.email }, profile: req.profile });
});

profileRouter.delete('/me', requireAuth, asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const { data: artworks } = await supabase.from('artworks').select('id').eq('owner_id', req.user!.id);
  const ids = (artworks || []).map((item) => item.id);
  if (ids.length) {
    const { data: assets } = await supabase.from('artwork_assets').select('bucket, storage_path').in('artwork_id', ids);
    const byBucket = new Map<string, string[]>();
    for (const asset of assets || []) byBucket.set(asset.bucket, [...(byBucket.get(asset.bucket) || []), asset.storage_path]);
    for (const [bucket, paths] of byBucket) await supabase.storage.from(bucket).remove(paths);
  }
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'account.delete', entity_type: 'profile', entity_id: req.user!.id });
  const { error } = await supabase.auth.admin.deleteUser(req.user!.id);
  if (error) throw error;
  res.status(204).end();
}));
