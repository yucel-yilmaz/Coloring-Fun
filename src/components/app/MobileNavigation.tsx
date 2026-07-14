import { Home, Images, Settings, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function MobileNavigation() {
  const { t } = useTranslation();
  const items = [
    { to: '/', label: t('nav.mobileColoring'), icon: Home },
    { to: '/create', label: t('nav.imagine'), icon: Sparkles },
    { to: '/gallery', label: t('nav.gallery'), icon: Images },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ] as const;
  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 border-t-4 border-black bg-white">
      <div className="flex justify-around items-center h-17 px-2 pt-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center justify-center px-3 py-1 transition-all rounded-full min-w-14 min-h-12 ${isActive ? 'bg-[#ffd700] text-black border-2 border-black shadow-[2px_2px_0_0_#000] -translate-y-1' : 'text-black/60'}`}>
            <Icon size={20} /><span className="font-display font-extrabold text-[10px] mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
