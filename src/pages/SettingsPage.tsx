import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SettingsPanel from '../components/SettingsPanel';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../lib/api';

export function SettingsPage() {
  const auth = useAuth();
  const [sound, setSound] = useState(() => JSON.parse(localStorage.getItem('coloring_sound') || 'true') as boolean);
  const deleteAccount = async () => {
    if (!window.confirm('Hesabın, AI anahtarların ve bütün özel çalışmaların kalıcı olarak silinecek. Devam edilsin mi?')) return;
    await api('/profile/me', { method: 'DELETE' });
    await auth.signOut();
  };
  return <>
    {auth.user && <div className="max-w-2xl mx-auto px-6 pt-8"><div className="bg-[#dff3e4] border-ink-thick rounded-3xl p-5 card-shadow"><h2 className="font-display font-black text-xl flex gap-2"><UserRound/>Ebeveyn hesabı</h2><p className="font-bold text-black/55 mt-2">{auth.profile?.display_name} · {auth.user.email}</p><div className="flex flex-wrap gap-2 mt-4"><Link to="/create" className="bg-white border-2 border-black rounded-full px-4 py-2 font-black flex gap-2"><KeyRound size={17}/>Çocuk ve AI bağlantıları</Link>{['admin','moderator'].includes(auth.profile?.role || '') && <Link to="/admin" className="bg-[#e6e0ff] border-2 border-black rounded-full px-4 py-2 font-black flex gap-2"><ShieldCheck size={17}/>Yönetim</Link>}<button onClick={deleteAccount} className="bg-[#ffceca] border-2 border-black rounded-full px-4 py-2 font-black">Hesabı sil</button></div></div></div>}
    <SettingsPanel soundEnabled={sound} onToggleSound={(enabled) => { setSound(enabled); localStorage.setItem('coloring_sound', JSON.stringify(enabled)); }}/>
  </>;
}
