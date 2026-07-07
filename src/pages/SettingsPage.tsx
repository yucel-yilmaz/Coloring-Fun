import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SettingsPanel from '../components/SettingsPanel';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../lib/api';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const [sound, setSound] = useState(() => JSON.parse(localStorage.getItem('coloring_sound') || 'true') as boolean);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('');

  useEffect(() => {
    api<{ supportEmail: string | null }>('/profile/support').then((response) => setSupportEmail(response.supportEmail)).catch(() => undefined);
  }, []);

  const deleteAccount = async () => {
    if (!window.confirm(t('settings.deleteConfirm'))) return;
    await api('/profile/me', { method: 'DELETE' });
    await auth.signOut();
  };

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth.user) {
      setContactStatus(t('settings.contactLoginRequired'));
      return;
    }
    try {
      await api('/profile/support', { method: 'POST', body: JSON.stringify({ subject: contactSubject, message: contactMessage }) });
      setContactSubject('');
      setContactMessage('');
      setContactStatus(t('settings.contactSent'));
    } catch (reason) {
      setContactStatus(reason instanceof Error ? reason.message : t('settings.contactFailed'));
    }
  };

  return <>
    <div className="max-w-2xl mx-auto px-6 pt-8">
      <div className="bg-white border-ink-thick rounded-3xl p-5 card-shadow">
        <h2 className="font-display font-black text-xl">{t('settings.languageTitle')}</h2>
        <p className="font-bold text-black/55 mt-2">{t('settings.languageDesc')}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => i18n.changeLanguage('tr')} className={`border-2 border-black rounded-full px-4 py-2 font-black ${i18n.language === 'tr' ? 'bg-[#ffd700]' : 'bg-white'}`}>{t('settings.turkish')}</button>
          <button onClick={() => i18n.changeLanguage('en')} className={`border-2 border-black rounded-full px-4 py-2 font-black ${i18n.language === 'en' ? 'bg-[#ffd700]' : 'bg-white'}`}>{t('settings.english')}</button>
        </div>
      </div>
    </div>
    <div className="max-w-2xl mx-auto px-6 pt-8">
      <div className="bg-[#fff2b2] border-ink-thick rounded-3xl p-5 card-shadow">
        <h2 className="font-display font-black text-xl">{t('settings.contactTitle')}</h2>
        <p className="font-bold text-black/65 mt-2">{t('settings.contactDesc')}</p>
        {supportEmail && <p className="font-bold text-black/70 mt-2">{t('settings.contactEmailLabel')}: <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a></p>}
        <form onSubmit={submitContact} className="mt-4 space-y-3">
          <input value={contactSubject} onChange={(event) => setContactSubject(event.target.value)} placeholder={t('settings.contactSubject')} className="w-full border-2 border-black rounded-xl px-3 py-2.5 font-bold" minLength={3} maxLength={120} required />
          <textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder={t('settings.contactMessage')} className="w-full min-h-28 border-2 border-black rounded-xl px-3 py-2.5 font-medium" minLength={10} maxLength={1200} required />
          <button className="bg-white border-2 border-black rounded-full px-5 py-2.5 font-black">{t('settings.contactAction')}</button>
          {contactStatus && <p className="font-bold text-sm">{contactStatus}</p>}
        </form>
      </div>
    </div>
    {auth.user && <div className="max-w-2xl mx-auto px-6 pt-8"><div className="bg-[#dff3e4] border-ink-thick rounded-3xl p-5 card-shadow"><h2 className="font-display font-black text-xl flex gap-2"><UserRound/>{t('settings.parentAccount')}</h2><p className="font-bold text-black/55 mt-2">{auth.profile?.display_name} · {auth.user.email}</p><div className="flex flex-wrap gap-2 mt-4"><Link to="/create" className="bg-white border-2 border-black rounded-full px-4 py-2 font-black flex gap-2"><KeyRound size={17}/>{t('settings.childAndAi')}</Link>{['admin','moderator'].includes(auth.profile?.role || '') && <Link to="/admin" className="bg-[#e6e0ff] border-2 border-black rounded-full px-4 py-2 font-black flex gap-2"><ShieldCheck size={17}/>{t('settings.admin')}</Link>}<button onClick={deleteAccount} className="bg-[#ffceca] border-2 border-black rounded-full px-4 py-2 font-black">{t('settings.deleteAccount')}</button></div></div></div>}
    <SettingsPanel soundEnabled={sound} onToggleSound={(enabled) => { setSound(enabled); localStorage.setItem('coloring_sound', JSON.stringify(enabled)); }}/>
  </>;
}
