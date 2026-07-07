import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ColoringBoard from '../components/ColoringBoard';
import { ANIMALS } from '../data';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../lib/api';
import type { Animal } from '../types';

interface Artwork { id: string; title: string; category: Animal['category']; source: string; assets: Record<string, string> }

export function ColorPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const statePage = (location.state as { page?: Animal } | null)?.page;
  const [page, setPage] = useState<Animal | null>(statePage || ANIMALS.find((item) => item.id === id) || null);
  const [catalogChecked, setCatalogChecked] = useState(Boolean(statePage));
  const [error, setError] = useState('');
  useEffect(() => {
    if (statePage) return;
    api<Animal[]>('/coloring-pages').then((pages) => {
      const catalogPage = pages.find((item) => item.id === id);
      if (catalogPage) {
        setPage(catalogPage);
        return;
      }
      if (ANIMALS.some((item) => item.id === id)) {
        setPage(null);
        setError(t('colorPage.notFound'));
      }
    }).catch(() => undefined).finally(() => setCatalogChecked(true));
  }, [id, statePage, t]);
  useEffect(() => {
    if (!catalogChecked) return;
    if (page) return;
    const privateRequest = auth.user ? api<Artwork[]>('/artworks?scope=private') : Promise.resolve([]);
    Promise.all([privateRequest, api<Artwork[]>('/artworks/public').catch(() => [])]).then(([privateItems, publicItems]) => {
      const item = [...privateItems, ...publicItems].find((candidate) => candidate.id === id);
      if (!item?.assets.processed) throw new Error(t('colorPage.notFound'));
      setPage({ id: item.id, name: item.title, nameTr: item.title, title: item.title, lineArtUrl: item.assets.processed, maskUrl: item.assets.mask, source: item.source === 'generated' ? 'generated' : 'community', artworkId: item.id, category: item.category || 'animals', cardBgColor: 'bg-white', hoverBorderColor: '' });
    }).catch((reason) => setError(reason.message));
  }, [id, page, auth.user, catalogChecked, t]);
  if (error) return <div className="min-h-screen grid place-items-center font-display font-black text-xl">{error}</div>;
  if (!page) return <div className="min-h-screen grid place-items-center font-display font-black">{t('colorPage.preparing')}</div>;
  return <ColoringBoard animal={page} onSave={async (title, imageDataUrl) => {
    if (auth.user) { await api('/artworks/colored', { method: 'POST', body: JSON.stringify({ title, imageDataUrl, sourceArtworkId: page.artworkId }) }); navigate('/gallery'); }
    else { const link = document.createElement('a'); link.href = imageDataUrl; link.download = `${title || t('colorPage.defaultName')}.png`; link.click(); navigate('/'); }
  }} onBack={() => navigate(-1)}/>;
}
