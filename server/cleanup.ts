import { requireSupabase } from './supabase';

export async function runCleanup() {
  const supabase = requireSupabase();
  const sourceCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const jobCutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const auditCutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();

  const { data: expiredSources, error } = await supabase.from('artwork_assets')
    .select('id, bucket, storage_path').eq('kind', 'source').lt('created_at', sourceCutoff);
  if (error) throw error;
  for (const asset of expiredSources || []) {
    await supabase.storage.from(asset.bucket).remove([asset.storage_path]);
    await supabase.from('artwork_assets').delete().eq('id', asset.id);
  }
  await supabase.from('generation_jobs').delete().lt('created_at', jobCutoff).in('status', ['completed', 'failed', 'blocked', 'cancelled']);
  await supabase.from('audit_logs').delete().lt('created_at', auditCutoff);
  return { removedSources: expiredSources?.length || 0 };
}

if (process.argv[1]?.includes('cleanup')) {
  runCleanup()
    .then((result) => console.log('Cleanup complete', result))
    .catch((error) => { console.error('Cleanup failed', error instanceof Error ? error.message : error); process.exitCode = 1; });
}
