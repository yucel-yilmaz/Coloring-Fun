import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/app/AppShell';
import { ProtectedRoute } from './components/app/ProtectedRoute';
import { AuthProvider } from './features/auth/AuthProvider';

const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const CloudGalleryPage = lazy(() => import('./pages/CloudGalleryPage').then((module) => ({ default: module.CloudGalleryPage })));
const ColorPage = lazy(() => import('./pages/ColorPage').then((module) => ({ default: module.ColorPage })));
const CreatePage = lazy(() => import('./pages/CreatePage').then((module) => ({ default: module.CreatePage })));
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

export default function App() {
  const { t } = useTranslation();
  return <BrowserRouter><AuthProvider><Suspense fallback={<div className="min-h-screen grid place-items-center font-display font-black">{t('common.loadingStudio')}</div>}><Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
      <Route path="/gallery" element={<ProtectedRoute><CloudGalleryPage /></ProtectedRoute>} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/admin" element={<ProtectedRoute staff><AdminPage /></ProtectedRoute>} />
    </Route>
    <Route path="/color/:id" element={<ColorPage />} />
  </Routes></Suspense></AuthProvider></BrowserRouter>;
}
