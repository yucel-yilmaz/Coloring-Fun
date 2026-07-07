import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ColoringBoard from '../components/ColoringBoard';
import { ANIMALS } from '../data';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../lib/api';
import type { Animal } from '../types';

interface Artwork { id: string; title: string; category: Animal['category']; source: string; assets: Record<string, string> }
interface CatalogOverride { page_id: string; title?: string | null; category?: Animal['category'] | null; hidden: boolean }

export function ColorPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const statePage = (location.state as { page?: Animal } | null)?.page;
  const [page, setPage] = useState<Animal | null>(statePage || ANIMALS.find((item) => item.id === id) || null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (statePage || !ANIMALS.some((item) => item.id === id)) return;
    api<CatalogOverride[]>('/coloring-pages/overrides').then((overrides) => {
      const override = overrides.find((item) => item.page_id === id);
      if (override?.hidden) {
        setPage(null);
        setError('Boyama sayfası bulunamadı.');
        return;
      }
      const localPage = ANIMALS.find((item) => item.id === id);
      if (localPage && override) setPage({
        ...localPage,
        name: override.title || localPage.name,
        nameTr: override.title || localPage.nameTr,
        title: override.title || localPage.title,
        category: override.category || localPage.category,
      });
    }).catch(() => undefined);
  }, [id, statePage]);
  useEffect(() => {
    if (page) return;
    const privateRequest = auth.user ? api<Artwork[]>('/artworks?scope=private') : Promise.resolve([]);
    Promise.all([privateRequest, api<Artwork[]>('/artworks/public').catch(() => [])]).then(([privateItems, publicItems]) => {
      const item = [...privateItems, ...publicItems].find((candidate) => candidate.id === id);
      if (!item?.assets.processed) throw new Error('Boyama sayfası bulunamadı.');
      setPage({ id: item.id, name: item.title, nameTr: item.title, title: item.title, lineArtUrl: item.assets.processed, maskUrl: item.assets.mask, source: item.source === 'generated' ? 'generated' : 'community', artworkId: item.id, category: item.category || 'animals', cardBgColor: 'bg-white', hoverBorderColor: '' });
    }).catch((reason) => setError(reason.message));
  }, [id, page, auth.user]);
  if (error) return <div className="min-h-screen grid place-items-center font-display font-black text-xl">{error}</div>;
  if (!page) return <div className="min-h-screen grid place-items-center font-display font-black">Sayfa hazırlanıyor…</div>;
  return <ColoringBoard animal={page} onSave={async (title, imageDataUrl) => {
    if (auth.user) { await api('/artworks/colored', { method: 'POST', body: JSON.stringify({ title, imageDataUrl, sourceArtworkId: page.artworkId }) }); navigate('/gallery'); }
    else { const link = document.createElement('a'); link.href = imageDataUrl; link.download = `${title || 'boyama'}.png`; link.click(); navigate('/'); }
  }} onBack={() => navigate(-1)}/>;
}
