import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimalSelection } from '../components/app/AnimalSelection';
import { ANIMALS } from '../data';
import type { AnimalCategory } from '../features/app/types';
import { api } from '../lib/api';
import { useSeo } from '../lib/seo';
import type { Animal } from '../types';

interface PublicArtwork { id: string; title: string; category: Animal['category']; assets: Record<string, string> }

const CATEGORY_IDS: AnimalCategory[] = ['all', 'animals', 'dinos', 'vehicles', 'people', 'places', 'space'];

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo({
    title: 'Coloring Fun! — Yapay Zeka Destekli Boyama Atölyesi',
    description: t('home.heroDesc'),
    path: '/',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('category') as AnimalCategory | null;
  const category: AnimalCategory = requested && CATEGORY_IDS.includes(requested) ? requested : 'all';
  const setCategory = (next: AnimalCategory) => {
    setSearchParams(
      (params) => {
        if (next === 'all') params.delete('category');
        else params.set('category', next);
        return params;
      },
      { replace: true },
    );
  };
  const [community, setCommunity] = useState<Animal[]>([]);
  const [catalog, setCatalog] = useState<Animal[]>(ANIMALS);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    api<Animal[]>('/coloring-pages').then(setCatalog).catch(() => undefined).finally(() => setIsLoading(false));
  }, []);
  useEffect(() => {
    api<PublicArtwork[]>('/artworks/public').then((items) => setCommunity(items.filter((item) => item.assets.processed).map((item, index) => ({
      id: item.id, name: item.title, nameTr: item.title, title: item.title, lineArtUrl: item.assets.processed,
      source: 'community', artworkId: item.id, category: item.category || 'animals',
      cardBgColor: ['bg-[#dff3e4]', 'bg-[#e6e0ff]', 'bg-[#fff2b2]'][index % 3], hoverBorderColor: 'group-hover:bg-black',
    })))).catch(() => undefined);
  }, []);
  const allPages = useMemo(() => [...catalog, ...community], [catalog, community]);
  const pages = useMemo(
    () => allPages.filter((item) => category === 'all' || item.category === category),
    [category, allPages],
  );
  const counts = useMemo(() => {
    const result: Partial<Record<AnimalCategory, number>> = { all: allPages.length };
    for (const item of allPages) {
      const key = item.category as AnimalCategory;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }, [allPages]);
  return <>
    <div className="max-w-5xl mx-auto px-6 md:px-12 pt-8">
      <div className="bg-[#001e30] text-white border-ink-thick rounded-[30px] px-6 py-5 shadow-[6px_6px_0_0_#ffd700] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div><p className="font-display font-black text-lg flex items-center gap-2"><Sparkles className="text-[#ffd700]"/> {t('home.heroTitle')}</p><p className="text-white/70 text-sm font-semibold mt-1">{t('home.heroDesc')}</p></div>
        <Link to="/create" className="shrink-0 bg-[#ffd700] text-black border-2 border-white rounded-full px-5 py-2.5 font-display font-black">{t('home.newPage')}</Link>
      </div>
    </div>
    <AnimalSelection animals={pages} activeCategory={category} counts={counts} isLoading={isLoading} onCategoryChange={setCategory} onSelectAnimal={(animal) => navigate(`/color/${animal.id}`, { state: { page: animal } })} onCreate={() => navigate('/create')} onOpenGuide={() => navigate('/settings')} />
  </>;
}
