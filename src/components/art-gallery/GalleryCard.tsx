import { Calendar, Download, Star, Trash2 } from 'lucide-react';
import type { GalleryItem } from '../../types';
import { playBubblePop } from '../../utils/audio';
import { downloadGalleryItem } from '../../features/gallery/downloadGalleryItem';

interface GalleryCardProps {
  item: GalleryItem;
  featured: boolean;
  onOpen: (item: GalleryItem) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function GalleryCard({ item, featured, onOpen, onDelete, onToggleStar }: GalleryCardProps) {
  return (
    <div
      onClick={() => {
        playBubblePop();
        onOpen(item);
      }}
      className={`group bg-white border-ink-thick rounded-3xl shadow-[6px_6px_0px_0px_#000000] overflow-hidden flex flex-col hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#000000] transition-all cursor-pointer relative ${
        featured ? 'md:col-span-2 md:row-span-1' : ''
      }`}
      id={`gallery-item-${item.id}`}
    >
      <div className="flex-1 min-h-[220px] max-h-[350px] relative bg-[#ecf4ff] border-b-4 border-black p-4 flex items-center justify-center overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain max-h-[280px] filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.08)] transform group-hover:scale-105 transition-transform duration-300"
          id={`gallery-image-${item.id}`}
        />
        <button
          onClick={(event) => {
            event.stopPropagation();
            playBubblePop();
            onToggleStar(item.id);
          }}
          className={`absolute top-4 right-4 border-2 border-black rounded-full w-12 h-12 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] transition-all hover:scale-110 active:scale-95 ${
            item.isStarred ? 'bg-[#ffd700]' : 'bg-white'
          }`}
          id={`btn-star-item-${item.id}`}
        >
          <Star size={20} fill={item.isStarred ? '#000000' : 'none'} className="stroke-black stroke-[2.5px]" />
        </button>
      </div>

      <div className="p-5 bg-[#f7f9ff] flex justify-between items-center h-24">
        <div>
          <h3 className="font-display font-black text-xl text-black truncate max-w-[180px] md:max-w-[240px]">{item.title}</h3>
          <p className="font-sans font-medium text-black/50 text-xs flex items-center gap-1.5 mt-1">
            <Calendar size={13} /> {item.date}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              downloadGalleryItem(item);
            }}
            className="bg-[#cbe6ff] hover:bg-[#badeff] border-2 border-black rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0px_0px_#000000] cursor-pointer"
            id={`btn-download-item-${item.id}`}
            title="İndir"
          >
            <Download size={18} className="stroke-black stroke-[2.5px]" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              playBubblePop();
              onDelete(item.id);
            }}
            className="bg-[#ffceca] hover:bg-[#ffb3ae] border-2 border-black rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0px_0px_#000000] cursor-pointer text-[#ba1724]"
            id={`btn-delete-item-${item.id}`}
            title="Sil"
          >
            <Trash2 size={18} className="stroke-[2.5px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
