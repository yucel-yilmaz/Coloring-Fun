import { createClient } from '@supabase/supabase-js';
import { config, isCloudConfigured } from './config';

export const supabaseAdmin = isCloudConfigured()
  ? createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function requireSupabase() {
  if (!supabaseAdmin) throw new Error('CLOUD_NOT_CONFIGURED');
  return supabaseAdmin;
}
