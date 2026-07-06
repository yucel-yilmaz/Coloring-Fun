import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AnimalSelection } from '../components/app/AnimalSelection';
import { ANIMALS } from '../data';
import type { AnimalCategory } from '../features/app/types';
import { api } from '../lib/api';
import type { Animal } from '../types';

interface PublicArtwork { id: string; title: string; category: Animal['category']; assets: Record<string, string> }

export function HomePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<AnimalCategory>('all');
  const [community, setCommunity] = useState<Animal[]>([]);
  useEffect(() => {
    api<PublicArtwork[]>('/artworks/public').then((items) => setCommunity(items.filter((item) => item.assets.processed).map((item, index) => ({
      id: item.id, name: item.title, nameTr: item.title, title: item.title, lineArtUrl: item.assets.processed,
      source: 'community', artworkId: item.id, category: item.category || 'animals',
      cardBgColor: ['bg-[#dff3e4]', 'bg-[#e6e0ff]', 'bg-[#fff2b2]'][index % 3], hoverBorderColor: 'group-hover:bg-black',
    })))).catch(() => undefined);
  }, []);
  const pages = useMemo(() => [...ANIMALS, ...community].filter((item) => category === 'all' || item.category === category), [category, community]);
  return <>
    <div className="max-w-5xl mx-auto px-6 md:px-12 pt-8">
      <div className="bg-[#001e30] text-white border-ink-thick rounded-[30px] px-6 py-5 shadow-[6px_6px_0_0_#ffd700] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div><p className="font-display font-black text-lg flex items-center gap-2"><Sparkles className="text-[#ffd700]"/> Aklındaki resmi sen anlatma, seçimlerini yap.</p><p className="text-white/70 text-sm font-semibold mt-1">Boyama reçetesi fikrini güvenli ve boyanabilir bir sayfaya dönüştürür.</p></div>
        <Link to="/create" className="shrink-0 bg-[#ffd700] text-black border-2 border-white rounded-full px-5 py-2.5 font-display font-black">Yeni sayfa üret</Link>
      </div>
    </div>
    <AnimalSelection animals={pages} activeCategory={category} onCategoryChange={setCategory} onSelectAnimal={(animal) => navigate(`/color/${animal.id}`, { state: { page: animal } })} onOpenGuide={() => navigate('/settings')} />
  </>;
}
