import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return undefined as T;
  if (!contentType.includes('application/json')) {
    await response.text();
    throw new ApiError(
      'INVALID_API_RESPONSE',
      'API JSON yerine HTML döndürdü. Uygulama sunucusunu yeniden başlatın.',
      response.status,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.code || 'REQUEST_FAILED', body.message || 'İşlem tamamlanamadı.', response.status);
  }
  return response.json() as Promise<T>;
}
