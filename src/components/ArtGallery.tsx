import { useState } from 'react';
import { Star } from 'lucide-react';
import type { GalleryItem } from '../types';
import { playToolSelect } from '../utils/audio';
import { GalleryCard } from './art-gallery/GalleryCard';
import { GalleryModal } from './art-gallery/GalleryModal';

interface ArtGalleryProps {
  items: GalleryItem[];
  onDeleteItem: (id: string) => void;
  onToggleStar: (id: string) => void;
}

type GalleryFilter = 'all' | 'starred';

export default function ArtGallery({ items, onDeleteItem, onToggleStar }: ArtGalleryProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const filteredItems = items.filter((item) => filter === 'all' || item.isStarred);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const changeFilter = (nextFilter: GalleryFilter) => {
    playToolSelect();
    setFilter(nextFilter);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-12 py-8 pb-32 animate-pop">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 gap-4">
        <div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-black">Sanat Galerim 🏆</h2>
          <p className="font-sans font-semibold text-black/60 mt-2 text-lg">Bütün boyadığın şaheserlere buradan göz atabilirsin!</p>
        </div>
        <div className="flex gap-3">
          {(['all', 'starred'] as const).map((filterName) => (
            <button
              key={filterName}
              onClick={() => changeFilter(filterName)}
              className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black transition-all cursor-pointer ${
                filter === filterName
                  ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_#000000]'
                  : 'bg-white hover:bg-slate-50 card-shadow'
              }`}
            >
              {filterName === 'all' ? 'Hepsi 🖼️' : 'Yıldızlılar ⭐'}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border-ink rounded-3xl p-8 text-center card-shadow">
          <div className="w-16 h-16 rounded-full bg-[#ffceca] border-2 border-black flex items-center justify-center text-[#ba1724] mb-4">
            <Star size={32} />
          </div>
          <h3 className="font-display font-black text-xl mb-1 text-black">Henüz boyama yok!</h3>
          <p className="font-sans font-medium text-black/50 max-w-xs">Haydi boyamak için ana sayfadan bir hayvan dostu seç!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => (
          <GalleryCard
            key={item.id}
            item={item}
            featured={index === 0 && filter === 'all'}
            onOpen={(selectedItem) => setSelectedItemId(selectedItem.id)}
            onDelete={onDeleteItem}
            onToggleStar={onToggleStar}
          />
        ))}
      </div>

      <GalleryModal item={selectedItem} onClose={() => setSelectedItemId(null)} onToggleStar={onToggleStar} />
    </div>
  );
}
