import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Calendar, 
  Download, 
  Trash2, 
  X, 
  Heart, 
  Filter, 
  ChevronRight,
  PartyPopper
} from 'lucide-react';
import { GalleryItem } from '../types';
import { playBubblePop, playToolSelect } from '../utils/audio';

interface ArtGalleryProps {
  items: GalleryItem[];
  onDeleteItem: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export default function ArtGallery({ items, onDeleteItem, onToggleStar }: ArtGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'starred'>('all');

  const filteredItems = items.filter(item => {
    if (filter === 'starred') return item.isStarred;
    return true;
  });

  const handleDownload = (item: GalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playBubblePop();
    
    const link = document.createElement('a');
    link.href = item.imageUrl;
    link.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-12 py-8 pb-32 animate-pop">
      {/* Gallery Header */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 gap-4">
        <div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-black">
            Sanat Galerim 🏆
          </h2>
          <p className="font-sans font-semibold text-black/60 mt-2 text-lg">
            Bütün boyadığın şaheserlere buradan göz atabilirsin!
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-3">
          <button
            onClick={() => { playToolSelect(); setFilter('all'); }}
            className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black transition-all cursor-pointer ${filter === 'all' ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_#000000]' : 'bg-white hover:bg-slate-50 card-shadow'}`}
          >
            Hepsi 🖼️
          </button>
          <button
            onClick={() => { playToolSelect(); setFilter('starred'); }}
            className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black transition-all cursor-pointer ${filter === 'starred' ? 'bg-[#ffd700] shadow-[2px_2px_0px_0px_#000000]' : 'bg-white hover:bg-slate-50 card-shadow'}`}
          >
            Yıldızlılar ⭐
          </button>
        </div>
      </div>

      {/* Grid Empty State */}
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border-ink rounded-3xl p-8 text-center card-shadow">
          <div className="w-16 h-16 rounded-full bg-[#ffceca] border-2 border-black flex items-center justify-center text-[#ba1724] mb-4">
            <Star size={32} />
          </div>
          <h3 className="font-display font-black text-xl mb-1 text-black">Henüz boyama yok!</h3>
          <p className="font-sans font-medium text-black/50 max-w-xs">
            Haydi boyamak için ana sayfadan bir hayvan dostu seç!
          </p>
        </div>
      )}

      {/* Bento-ish Art Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            onClick={() => { playBubblePop(); setSelectedItem(item); }}
            className={`group bg-white border-ink-thick rounded-3xl shadow-[6px_6px_0px_0px_#000000] overflow-hidden flex flex-col hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000000] transition-all cursor-pointer relative ${
              index === 0 && filter === 'all' ? 'md:col-span-2 md:row-span-1' : ''
            }`}
            id={`gallery-item-${item.id}`}
          >
            {/* Image Canvas Panel */}
            <div className="flex-1 min-h-[220px] max-h-[350px] relative bg-[#ecf4ff] border-b-4 border-black p-4 flex items-center justify-center overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[280px] filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transform group-hover:scale-105 transition-transform duration-300"
                id={`gallery-image-${item.id}`}
              />

              {/* Star Indicator Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playBubblePop();
                  onToggleStar(item.id);
                }}
                className={`absolute top-4 right-4 border-2 border-black rounded-full w-12 h-12 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] transition-all hover:scale-110 active:scale-95 ${
                  item.isStarred ? 'bg-[#ffd700]' : 'bg-white'
                }`}
                id={`btn-star-item-${item.id}`}
              >
                <Star
                  size={20}
                  fill={item.isStarred ? '#000000' : 'none'}
                  className="stroke-black stroke-[2.5px]"
                />
              </button>
            </div>

            {/* Title Block info */}
            <div className="p-5 bg-[#f7f9ff] flex justify-between items-center h-24">
              <div>
                <h3 className="font-display font-black text-xl text-black truncate max-w-[180px] md:max-w-[240px]">
                  {item.title}
                </h3>
                <p className="font-sans font-medium text-black/50 text-xs flex items-center gap-1.5 mt-1">
                  <Calendar size={13} /> {item.date}
                </p>
              </div>

              {/* Action Circle Button */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleDownload(item, e)}
                  className="bg-[#cbe6ff] hover:bg-[#badeff] border-2 border-black rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000000] cursor-pointer"
                  id={`btn-download-item-${item.id}`}
                  title="İndir"
                >
                  <Download size={18} className="stroke-black stroke-[2.5px]" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playBubblePop();
                    onDeleteItem(item.id);
                  }}
                  className="bg-[#ffceca] hover:bg-[#ffb3ae] border-2 border-black rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000000] cursor-pointer text-[#ba1724]"
                  id={`btn-delete-item-${item.id}`}
                  title="Sil"
                >
                  <Trash2 size={18} className="stroke-[2.5px]" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Masterpiece Fullscreen Frame Inspector Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-ink-thick rounded-[32px] shadow-[8px_8px_0px_0px_#000000] w-full max-w-lg p-6 relative overflow-hidden"
              id="gallery-item-fullscreen-modal"
            >
              {/* Close Button with neobrutalist offset shadow */}
              <button
                onClick={() => { playBubblePop(); setSelectedItem(null); }}
                className="absolute top-4 right-4 bg-white border-2 border-black rounded-full w-10 h-10 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] hover:scale-110 active:scale-95 transition-all cursor-pointer text-black"
                id="btn-close-gallery-fullscreen"
              >
                <X size={20} className="stroke-[3px]" />
              </button>

              {/* Decorative Tape Element */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-[#ffb3ae] border-2 border-black rotate-[-2deg] opacity-90"></div>

              {/* Drawing Preview in thick frame */}
              <div className="w-full aspect-square bg-[#ecf4ff] border-ink-thick rounded-2xl p-4 flex items-center justify-center overflow-hidden mb-6 mt-4 relative">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>

              <div className="text-center">
                <h3 className="font-display font-black text-2xl text-black">
                  {selectedItem.title}
                </h3>
                <p className="font-sans font-bold text-black/50 text-sm mt-1">
                  Boyandığı Tarih: {selectedItem.date}
                </p>

                <div className="mt-6 flex gap-4 w-full">
                  <button
                    onClick={() => handleDownload(selectedItem)}
                    className="flex-1 h-14 bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-base border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-fullscreen-download"
                  >
                    <Download size={18} className="stroke-black stroke-[3px]" />
                    Şaheseri İndir 📥
                  </button>
                  <button
                    onClick={() => {
                      playBubblePop();
                      onToggleStar(selectedItem.id);
                      setSelectedItem(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
                    }}
                    className={`h-14 px-5 border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center cursor-pointer ${
                      selectedItem.isStarred ? 'bg-[#ffceca]' : 'bg-white'
                    }`}
                    id="btn-fullscreen-star"
                  >
                    <Star
                      size={20}
                      fill={selectedItem.isStarred ? '#000000' : 'none'}
                      className="stroke-black stroke-[2.5px]"
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
