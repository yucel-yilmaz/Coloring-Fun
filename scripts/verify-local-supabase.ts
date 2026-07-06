import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) throw new Error('Yerel Supabase public ayarları bulunamadı.');

const email = 'admin@coloring.fun';
const password = 'LocalAdmin123!';
const supabase = createClient(url, publishableKey, { auth: { persistSession: false } });

async function request<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:3000/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

async function main() {
  const signup = await supabase.auth.signUp({ email, password, options: { data: { full_name: 'Yerel Admin' } } });
  if (signup.error && !signup.error.message.toLowerCase().includes('already')) throw signup.error;
  const session = signup.data.session || (await supabase.auth.signInWithPassword({ email, password })).data.session;
  if (!session) throw new Error('Yerel admin oturumu oluşturulamadı.');

  const me = await request<{ profile: { role: string } }>('/profile/me', session.access_token);
  if (me.profile.role !== 'admin') throw new Error(`Admin bootstrap başarısız: ${me.profile.role}`);
  const child = await request<{ id: string }>('/child-profiles', session.access_token, {
    method: 'POST', body: JSON.stringify({ nickname: 'Doğrulama Profili', ageBand: '6-8', avatarKey: 'star' }),
  });
  await request(`/child-profiles/${child.id}`, session.access_token, { method: 'DELETE' });
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP2+3wAAAABJRU5ErkJggg==';
  const artwork = await request<{ id: string; assets: { colored?: string } }>('/artworks/colored', session.access_token, {
    method: 'POST', body: JSON.stringify({ title: 'Storage doğrulaması', imageDataUrl: onePixelPng }),
  });
  if (!artwork.assets.colored) throw new Error('Private Storage signed URL oluşturulamadı.');
  await request(`/artworks/${artwork.id}`, session.access_token, { method: 'DELETE' });
  const skills = await request<Array<{ slug: string; active_version_id: string | null }>>('/admin/skills', session.access_token);
  if (skills.length !== 7 || skills.some((skill) => !skill.active_version_id)) throw new Error('Skill seed doğrulaması başarısız.');
  console.log(`Supabase doğrulandı: admin rolü, Auth/API/RLS, private Storage ve ${skills.length} aktif skill hazır.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
