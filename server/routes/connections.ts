import { Router } from 'express';
import { config } from '../config';
import { asyncRoute, HttpError } from '../http';
import { requireAuth } from '../middleware/auth';
import { createProvider } from '../providers';
import type { AiProvider } from '../providers/types';
import { decryptSecret, encryptSecret, maskSecret } from '../security/crypto';
import { requireSupabase } from '../supabase';
import { connectionSchema } from '../validation';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-image-2',
  gemini: 'gemini-3.1-flash-image',
  fal: 'fal-ai/fast-lightning-sdxl',
  replicate: 'bytedance/sdxl-lightning-4step',
  huggingface: 'black-forest-labs/FLUX.1-schnell',
  stability: 'stable-image-core',
  local_sdxl: 'sdxl-lightning-coloringbook',
};

export const connectionsRouter = Router();
connectionsRouter.use(requireAuth);

const safeFields = 'id, provider, model, masked_hint, status, last_verified_at, created_at';

connectionsRouter.get('/', asyncRoute(async (req, res) => {
  const { data, error } = await requireSupabase().from('ai_connections').select(safeFields).eq('user_id', req.user!.id).order('created_at');
  if (error) throw error;
  res.json(data);
}));

connectionsRouter.post('/', asyncRoute(async (req, res) => {
  const input = connectionSchema.parse(req.body);
  if (input.provider === 'local_sdxl' && !config.localAiEnabled) {
    throw new HttpError(400, 'LOCAL_AI_DISABLED', 'Yerel SDXL bu kurulumda kapalı. Gemini veya OpenAI bağlantısı ekleyin.');
  }
  const supabase = requireSupabase();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('actor_id', req.user!.id).eq('action', 'ai_connection.test').gte('created_at', since);
  if ((count || 0) >= 10) throw new HttpError(429, 'CONNECTION_TEST_LIMIT', 'Bağlantı testi için saatlik sınıra ulaştınız.');
  const model = input.model || DEFAULT_MODELS[input.provider];
  const secret = input.provider === 'local_sdxl' ? 'local-sdxl' : input.apiKey;
  const validation = await createProvider(input.provider, secret).validateConnection();
  const { data, error } = await supabase.from('ai_connections').insert({
    user_id: req.user!.id,
    provider: input.provider,
    model,
    ...encryptSecret(secret),
    masked_hint: input.provider === 'local_sdxl' ? 'Bu PC' : maskSecret(secret),
    status: validation.valid ? 'ready' : 'invalid',
    last_verified_at: validation.valid ? new Date().toISOString() : null,
  }).select(safeFields).single();
  if (error) throw error;
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'ai_connection.test', entity_type: 'ai_connection', entity_id: data.id, metadata: { provider: input.provider, valid: validation.valid } });
  res.status(201).json({ ...data, validationMessage: validation.message });
}));

connectionsRouter.post('/:id/test', asyncRoute(async (req, res) => {
  const supabase = requireSupabase();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('actor_id', req.user!.id).eq('action', 'ai_connection.test').gte('created_at', since);
  if ((count || 0) >= 10) throw new HttpError(429, 'CONNECTION_TEST_LIMIT', 'Bağlantı testi için saatlik sınıra ulaştınız.');
  const { data: connection, error } = await supabase.from('ai_connections').select('*')
    .eq('id', req.params.id).eq('user_id', req.user!.id).single();
  if (error || !connection) throw new HttpError(404, 'CONNECTION_NOT_FOUND', 'AI bağlantısı bulunamadı.');
  if (connection.provider === 'local_sdxl' && !config.localAiEnabled) {
    await supabase.from('ai_connections').update({ status: 'invalid', last_verified_at: new Date().toISOString() }).eq('id', connection.id);
    return res.json({ valid: false, message: 'Yerel SDXL bu kurulumda kapalı. Gemini veya OpenAI bağlantısı ekleyin.' });
  }
  const result = await createProvider(connection.provider, decryptSecret(connection)).validateConnection();
  await supabase.from('ai_connections').update({ status: result.valid ? 'ready' : 'invalid', last_verified_at: new Date().toISOString() }).eq('id', connection.id);
  await supabase.from('audit_logs').insert({ actor_id: req.user!.id, action: 'ai_connection.test', entity_type: 'ai_connection', entity_id: connection.id, metadata: { provider: connection.provider, valid: result.valid } });
  res.json(result);
}));

connectionsRouter.delete('/:id', asyncRoute(async (req, res) => {
  const { error } = await requireSupabase().from('ai_connections').delete().eq('id', req.params.id).eq('user_id', req.user!.id);
  if (error) throw error;
  res.status(204).end();
}));
