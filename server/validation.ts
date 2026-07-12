import { z } from 'zod';

export const childProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  ageBand: z.enum(['3-5', '6-8', '9-12']),
  avatarKey: z.enum(['sun', 'star', 'rocket', 'rainbow', 'dino']).default('sun'),
});

const connectionModel = z.string().trim().min(1).max(100).optional();
export const connectionSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('openai'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('gemini'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('fal'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('replicate'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('huggingface'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('stability'), apiKey: z.string().trim().min(10).max(500), model: connectionModel }),
  z.object({ provider: z.literal('local_sdxl'), apiKey: z.string().optional(), model: connectionModel }),
]);

export const generationSchema = z.object({
  childProfileId: z.string().uuid(),
  providerConnectionId: z.string().uuid(),
  subjectPreset: z.string().trim().min(2).max(80),
  customIdea: z.string().trim().max(240).optional().default(''),
  ageBand: z.enum(['3-5', '6-8', '9-12']),
  difficulty: z.enum(['easy', 'medium', 'detailed']),
  sceneDensity: z.enum(['single', 'simple-scene', 'full-scene']),
  lineWeight: z.enum(['thick', 'medium']),
  orientation: z.enum(['portrait', 'landscape']),
});

export const submitArtworkSchema = z.object({
  title: z.string().trim().min(2).max(100),
  category: z.enum(['animals', 'dinos', 'vehicles', 'people', 'places', 'space']),
  rightsConfirmed: z.literal(true),
});

export const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reasonCode: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.decision !== 'approve' && (!value.reasonCode || !value.note)) {
    context.addIssue({ code: 'custom', path: ['note'], message: 'Ret ve düzeltme kararında neden ile açıklama zorunludur.' });
  }
});

export const supportContactSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(1200),
});
