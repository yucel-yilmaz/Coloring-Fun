import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/AuthProvider';

export function ProtectedRoute({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const auth = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  if (auth.loading) return <div className="min-h-[60vh] grid place-items-center font-display font-black">{t('common.loadingStudio')}</div>;
  if (!auth.user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (staff && !['admin', 'moderator'].includes(auth.profile?.role || '')) return <Navigate to="/" replace />;
  return children;
}
