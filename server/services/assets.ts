import { config } from '../config';
import { requireSupabase } from '../supabase';

export function publicStorageUrl(value: string) {
  if (!config.supabasePublicUrl || config.supabasePublicUrl === config.supabaseUrl) return value;
  const source = new URL(value);
  const target = new URL(config.supabasePublicUrl);
  source.protocol = target.protocol;
  source.host = target.host;
  return source.toString();
}

export async function attachAssetUrls<T extends { id: string; status: string }>(artworks: T[]) {
  if (!artworks.length) return [];
  const supabase = requireSupabase();
  const { data: assets } = await supabase.from('artwork_assets').select('*').in('artwork_id', artworks.map((item) => item.id));
  return Promise.all(artworks.map(async (artwork) => {
    const ownAssets = (assets || []).filter((asset) => asset.artwork_id === artwork.id);
    const urls: Record<string, string> = {};
    await Promise.all(ownAssets.map(async (asset) => {
      if (asset.bucket === 'public-artworks') {
        urls[asset.kind] = publicStorageUrl(supabase.storage.from(asset.bucket).getPublicUrl(asset.storage_path).data.publicUrl);
      } else {
        const { data } = await supabase.storage.from(asset.bucket).createSignedUrl(asset.storage_path, 3600);
        if (data?.signedUrl) urls[asset.kind] = publicStorageUrl(data.signedUrl);
      }
    }));
    return { ...artwork, assets: urls };
  }));
}

export async function deleteArtworkWithAssets(artworkId: string) {
  const supabase = requireSupabase();
  const { data: assets } = await supabase.from('artwork_assets').select('bucket, storage_path').eq('artwork_id', artworkId);
  const grouped = new Map<string, string[]>();
  for (const asset of assets || []) grouped.set(asset.bucket, [...(grouped.get(asset.bucket) || []), asset.storage_path]);
  for (const [bucket, paths] of grouped) await supabase.storage.from(bucket).remove(paths);
  const { error } = await supabase.from('artworks').delete().eq('id', artworkId);
  if (error) throw error;
}
