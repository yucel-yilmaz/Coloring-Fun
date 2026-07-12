import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv();

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublicUrl: process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  encryptionKey: process.env.AI_KEYS_MASTER_KEY || '',
  moderationKey: process.env.GEMINI_MODERATION_API_KEY || '',
  allowDegradedModeration:
    process.env.NODE_ENV !== 'production'
    && process.env.ALLOW_DEGRADED_MODERATION === 'true',
  localAiEnabled: process.env.LOCAL_AI_ENABLED !== 'false',
  localImageApiUrl: process.env.LOCAL_IMAGE_API_URL || 'http://127.0.0.1:7861',
  adminEmails: new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
  supportEmail: (process.env.SUPPORT_EMAIL || '').trim(),
  dailyGenerationLimit: Number(process.env.DAILY_GENERATION_LIMIT) || 20,
  workerPollMs: Number(process.env.WORKER_POLL_MS) || 2000,
  comfyControlNetModel: process.env.COMFYUI_CONTROLNET_MODEL || 'diffusers_xl_canny_mid.safetensors',
  comfyControlNetStrength: Number(process.env.COMFYUI_CONTROLNET_STRENGTH) || 0.45,
  comfyControlNetEnabled: process.env.COMFYUI_CONTROLNET_ENABLED !== 'false',
};

export function isCloudConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseSecretKey);
}
