import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { api } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface Profile { id: string; role: 'parent' | 'moderator' | 'admin'; display_name: string }
interface AuthValue {
  configured: boolean;
  googleEnabled: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<string>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true';

  const refreshProfile = async () => {
    if (!supabase || !(await supabase.auth.getSession()).data.session) {
      setProfile(null);
      return;
    }
    const result = await api<{ profile: Profile }>('/profile/me');
    setProfile(result.profile);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) refreshProfile().catch(() => setProfile(null)).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
      else setTimeout(() => refreshProfile().catch(() => setProfile(null)), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(() => ({
    configured: isSupabaseConfigured,
    googleEnabled,
    loading,
    user: session?.user || null,
    profile,
    refreshProfile,
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase yapılandırılmadı.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, displayName) {
      if (!supabase) throw new Error('Supabase yapılandırılmadı.');
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: displayName } } });
      if (error) throw error;
      return data.session ? 'Hesabın hazır.' : 'E-postana gönderilen doğrulama bağlantısını aç.';
    },
    async signInWithGoogle() {
      if (!supabase) throw new Error('Supabase yapılandırılmadı.');
      if (!googleEnabled) throw new Error('Google girişi henüz yapılandırılmadı. E-posta ve şifre ile giriş yapın.');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    },
    async signOut() { await supabase?.auth.signOut(); },
  }), [googleEnabled, loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
