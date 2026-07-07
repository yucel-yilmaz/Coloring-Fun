import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (auth.user) return <Navigate to={(location.state as { from?: string })?.from || '/'} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'login') { await auth.signIn(email, password); navigate((location.state as { from?: string })?.from || '/'); }
      else setMessage(await auth.signUp(email, password, displayName));
    } catch (error) { setMessage(error instanceof Error ? error.message : t('login.failed')); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 pb-28 grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-stretch">
      <section className="bg-[#ffd700] border-ink-thick rounded-[36px] p-8 md:p-12 shadow-[10px_10px_0_0_#000] flex flex-col justify-between min-h-[470px]">
        <div><span className="inline-flex items-center gap-2 bg-white border-2 border-black rounded-full px-4 py-2 font-display font-black text-sm"><Sparkles size={17}/> {t('login.workshop')}</span>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] mt-8">{t('login.hero')}</h1></div>
        <p className="font-bold text-black/65 max-w-lg mt-8">{t('login.heroDesc')}</p>
      </section>
      <section className="bg-white border-ink-thick rounded-[36px] p-7 md:p-9 card-shadow">
        <h2 className="font-display font-extrabold text-3xl">{mode === 'login' ? t('login.enterWorkshop') : t('login.createParentAccount')}</h2>
        {!auth.configured && <div className="mt-5 bg-[#fff2b2] border-2 border-black rounded-2xl p-4 font-bold text-sm">{t('login.missingConfig')}</div>}
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'signup' && <label className="block font-bold text-sm">{t('login.yourName')}<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full border-2 border-black rounded-xl px-4 py-3" /></label>}
          <label className="block font-bold text-sm">{t('login.email')}<div className="relative mt-1"><Mail className="absolute left-3 top-3.5" size={18}/><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-2 border-black rounded-xl pl-10 pr-4 py-3" /></div></label>
          <label className="block font-bold text-sm">{t('login.password')}<div className="relative mt-1"><KeyRound className="absolute left-3 top-3.5" size={18}/><input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-black rounded-xl pl-10 pr-4 py-3" /></div></label>
          {message && <p className="bg-[#e1f0ff] border-2 border-black rounded-xl p-3 text-sm font-bold">{message}</p>}
          <button disabled={busy || !auth.configured} className="w-full bg-[#001e30] text-white border-2 border-black rounded-full py-3 font-display font-black disabled:opacity-40">{busy ? t('login.wait') : mode === 'login' ? t('login.signIn') : t('login.signUp')}</button>
        </form>
        {auth.googleEnabled && <button onClick={() => auth.signInWithGoogle().catch((error) => setMessage(error.message))} disabled={!auth.configured} className="mt-3 w-full bg-white border-2 border-black rounded-full py-3 font-display font-black card-shadow disabled:opacity-40">{t('login.continueGoogle')}</button>}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} className="mt-6 w-full text-sm font-black underline">{mode === 'login' ? t('login.createNew') : t('login.iHaveAccount')}</button>
      </section>
    </div>
  );
}
