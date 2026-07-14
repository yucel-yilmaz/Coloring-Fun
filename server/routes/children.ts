import { Router } from 'express';
import { asyncRoute, HttpError } from '../http';
import { requireAuth } from '../middleware/auth';
import { requireSupabase } from '../supabase';
import { childProfileSchema } from '../validation';

export const childrenRouter = Router();
childrenRouter.use(requireAuth);

childrenRouter.get('/', asyncRoute(async (req, res) => {
  const { data, error } = await requireSupabase().from('child_profiles').select('*').eq('parent_id', req.user!.id).order('created_at');
  if (error) throw error;
  res.json(data);
}));

childrenRouter.post('/', asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const input = childProfileSchema.parse(req.body);
  const { count } = await supabase.from('child_profiles').select('id', { count: 'exact', head: true }).eq('parent_id', req.user!.id);
  if ((count || 0) >= 5) throw new HttpError(409, 'CHILD_LIMIT', 'En fazla 5 çocuk profili oluşturabilirsiniz.');
  const { data, error } = await supabase.from('child_profiles').insert({
    parent_id: req.user!.id, nickname: input.nickname, age_band: input.ageBand, avatar_key: input.avatarKey,
  }).select('*').single();
  if (error) throw error;
  res.status(201).json(data);
}));

childrenRouter.patch('/:id', asyncRoute(async (req, res) => {
  const input = childProfileSchema.partial().parse(req.body);
  const payload = {
    ...(input.nickname && { nickname: input.nickname }),
    ...(input.ageBand && { age_band: input.ageBand }),
    ...(input.avatarKey && { avatar_key: input.avatarKey }),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await requireSupabase().from('child_profiles').update(payload)
    .eq('id', req.params.id).eq('parent_id', req.user!.id).select('*').single();
  if (error) throw new HttpError(404, 'CHILD_NOT_FOUND', 'Çocuk profili bulunamadı.');
  res.json(data);
}));

childrenRouter.delete('/:id', asyncRoute(async (req, res) => {
  const { error } = await requireSupabase().from('child_profiles').delete().eq('id', req.params.id).eq('parent_id', req.user!.id);
  if (error) throw error;
  res.status(204).end();
}));
