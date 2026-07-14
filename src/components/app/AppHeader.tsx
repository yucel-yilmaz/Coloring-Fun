import { Images, LogIn, LogOut, Palette, Settings, ShieldCheck, Sparkles, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/AuthProvider';

const NAV_ITEMS = [
  { to: '/', key: 'nav.selectColoring', icon: Palette },
  { to: '/create', key: 'nav.imagine', icon: Sparkles },
  { to: '/gallery', key: 'nav.gallery', icon: Images },
  { to: '/settings', key: 'nav.settings', icon: Settings },
] as const;

export function AppHeader() {
  const auth = useAuth();
  const { t } = useTranslation();
  return (
    <header className="bg-white w-full top-0 sticky z-40 border-b-4 border-black shadow-[0_4px_0_0_#000] flex justify-between items-center px-4 md:px-10 py-3">
      <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
        <span className="w-11 h-11 rounded-full bg-[#ffd700] border-ink flex items-center justify-center animate-wobble-hover">
          <Palette className="text-[#705d00] w-6 h-6 stroke-[3px]" />
        </span>
        <span className="font-display font-extrabold text-xl md:text-2xl text-[#705d00] tracking-tight">Coloring Fun!</span>
      </Link>
      <nav className="hidden lg:flex items-center gap-5">
        {NAV_ITEMS.map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `font-display font-black text-sm flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${isActive ? 'bg-[#ffd700] border-2 border-black' : 'text-black/60 hover:text-black'}`}>
            <Icon size={17} />{t(key)}
          </NavLink>
        ))}
        {['admin', 'moderator'].includes(auth.profile?.role || '') && (
          <NavLink to="/admin" className="font-display font-black text-sm flex items-center gap-2 px-3 py-2 rounded-full bg-[#e6e0ff] border-2 border-black"><ShieldCheck size={17} />{t('nav.admin')}</NavLink>
        )}
      </nav>
      {auth.user ? (
        <button onClick={() => auth.signOut()} title={t('nav.logout')} className="w-11 h-11 rounded-full bg-[#ffceca] border-ink flex items-center justify-center card-shadow cursor-pointer"><LogOut size={21} /></button>
      ) : (
        <Link to="/login" title={t('nav.login')} className="w-11 h-11 rounded-full bg-white border-ink flex items-center justify-center card-shadow"><LogIn size={21} /></Link>
      )}
    </header>
  );
}
