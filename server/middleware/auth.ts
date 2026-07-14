import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { HttpError } from '../http';
import { requireSupabase } from '../supabase';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Oturum açmanız gerekiyor.');
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, 'INVALID_SESSION', 'Oturum geçersiz veya süresi dolmuş.');

    const email = data.user.email?.toLowerCase() || '';
    const bootstrapRole = data.user.email_confirmed_at && config.adminEmails.has(email) ? 'admin' : 'parent';
    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        display_name: data.user.user_metadata?.full_name || email.split('@')[0] || 'Ebeveyn',
        role: bootstrapRole,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('id', data.user.id)
      .single();
    if (profileError || !profile) throw new HttpError(500, 'PROFILE_ERROR', 'Kullanıcı profili hazırlanamadı.');
    req.user = data.user;
    req.profile = profile;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.profile || !['moderator', 'admin'].includes(req.profile.role)) {
    return next(new HttpError(403, 'STAFF_REQUIRED', 'Bu işlem için yönetici yetkisi gerekiyor.'));
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.profile?.role !== 'admin') {
    return next(new HttpError(403, 'ADMIN_REQUIRED', 'Bu işlem için admin yetkisi gerekiyor.'));
  }
  next();
}
