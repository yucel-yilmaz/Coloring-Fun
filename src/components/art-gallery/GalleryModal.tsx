import { AnimatePresence, motion } from 'motion/react';
import { Download, Star, X } from 'lucide-react';
import type { GalleryItem } from '../../types';
import { playBubblePop } from '../../utils/audio';
import { downloadGalleryItem } from '../../features/gallery/downloadGalleryItem';

interface GalleryModalProps {
  item: GalleryItem | null;
  onClose: () => void;
  onToggleStar: (id: string) => void;
}

export function GalleryModal({ item, onClose, onToggleStar }: GalleryModalProps) {
  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white border-ink-thick rounded-[32px] shadow-[8px_8px_0px_0px_#000000] w-full max-w-lg p-6 relative overflow-hidden"
            id="gallery-item-fullscreen-modal"
          >
            <button
              onClick={() => {
                playBubblePop();
                onClose();
              }}
              className="absolute top-4 right-4 bg-white border-2 border-black rounded-full w-10 h-10 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] hover:scale-110 active:scale-95 transition-all cursor-pointer text-black"
              id="btn-close-gallery-fullscreen"
            >
              <X size={20} className="stroke-[3px]" />
            </button>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-[#ffb3ae] border-2 border-black -rotate-2 opacity-90" />
            <div className="w-full aspect-square bg-[#ecf4ff] border-ink-thick rounded-2xl p-4 flex items-center justify-center overflow-hidden mb-6 mt-4 relative">
              <img src={item.imageUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-contain filter drop-shadow-md" />
            </div>
            <div className="text-center">
              <h3 className="font-display font-black text-2xl text-black">{item.title}</h3>
              <p className="font-sans font-bold text-black/50 text-sm mt-1">Boyandığı Tarih: {item.date}</p>
              <div className="mt-6 flex gap-4 w-full">
                <button
                  onClick={() => downloadGalleryItem(item)}
                  className="flex-1 h-14 bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-base border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-fullscreen-download"
                >
                  <Download size={18} className="stroke-black stroke-[3px]" />
                  Şaheseri İndir 📥
                </button>
                <button
                  onClick={() => {
                    playBubblePop();
                    onToggleStar(item.id);
                  }}
                  className={`h-14 px-5 border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-px hover:translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center cursor-pointer ${
                    item.isStarred ? 'bg-[#ffceca]' : 'bg-white'
                  }`}
                  id="btn-fullscreen-star"
                >
                  <Star size={20} fill={item.isStarred ? '#000000' : 'none'} className="stroke-black stroke-[2.5px]" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
