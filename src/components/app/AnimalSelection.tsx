import { ArrowRight, HelpCircle } from 'lucide-react';
import type { Animal } from '../../types';
import type { AnimalCategory } from '../../features/app/types';
import { getProxiedImageUrl } from '../../utils/image';

interface AnimalSelectionProps {
  animals: Animal[];
  activeCategory: AnimalCategory;
  onCategoryChange: (category: AnimalCategory) => void;
  onSelectAnimal: (animal: Animal) => void;
  onOpenGuide: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Hepsi ✨', activeClass: 'bg-[#ffd700] shadow-[2px_2px_0px_0px_#000000]' },
  { id: 'animals', label: 'Hayvan Dostlar 🐾', activeClass: 'bg-[#cbe6ff]' },
  { id: 'dinos', label: 'Dinozorlar 🦖', activeClass: 'bg-[#ffceca]' },
  { id: 'vehicles', label: 'Araçlar 🚗', activeClass: 'bg-[#fff2b2]' },
  { id: 'people', label: 'Ressamlar 🎨', activeClass: 'bg-[#e6e0ff]' },
  { id: 'places', label: 'Mekânlar 🏠', activeClass: 'bg-[#dff3e4]' },
] as const;

export function AnimalSelection({
  animals,
  activeCategory,
  onCategoryChange,
  onSelectAnimal,
  onOpenGuide,
}: AnimalSelectionProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-8 md:py-12 pb-32 animate-pop">
      <div className="mb-10 text-left">
        <h2 className="font-display font-extrabold text-4xl md:text-5xl text-black tracking-tight leading-none">
          Bir Arkadaş Seç ve Boya! 🦁
        </h2>
        <p className="font-sans font-semibold text-black/60 mt-3 text-lg md:text-xl">
          Kendi şaheserini yaratmak için bir hayvana veya dinozora dokun.
        </p>
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-5 py-2.5 font-display font-black text-sm rounded-full border-2 border-black cursor-pointer transition-all ${
              activeCategory === category.id ? category.activeClass : 'bg-white card-shadow'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {animals.map((animal) => (
          <button
            key={animal.id}
            onClick={() => onSelectAnimal(animal)}
            className={`group block w-full text-left ${animal.cardBgColor} border-ink-thick rounded-[32px] p-4.5 card-shadow card-shadow-hover card-shadow-active transition-all focus:outline-none focus:ring-4 focus:ring-black cursor-pointer`}
            id={`animal-card-${animal.id}`}
          >
            <div className="bg-white rounded-2xl border-ink aspect-square overflow-hidden mb-4 relative flex items-center justify-center p-3 shadow-inner">
              <img
                src={getProxiedImageUrl(animal.lineArtUrl)}
                alt={animal.name}
                referrerPolicy="no-referrer"
                className="object-contain w-full h-full opacity-95 group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none filter drop-shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="font-display font-black text-xl text-black">{animal.nameTr}</span>
              <span className="w-9 h-9 rounded-full bg-white border-ink flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-200">
                <ArrowRight size={18} className="stroke-[3px]" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-14 bg-white border-ink rounded-3xl p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#e1f0ff] flex items-center justify-center text-[#0001c0] shrink-0 border-2 border-black">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="font-display font-black text-lg text-black">Nasıl Oynanır Merak mı Ediyorsun?</h4>
            <p className="font-sans font-semibold text-black/50 text-sm">Kolay adımlarla harika şaheserler yaratmayı öğren.</p>
          </div>
        </div>
        <button
          onClick={onOpenGuide}
          className="bg-[#cbe6ff] hover:bg-[#badeff] border-2 border-black rounded-full px-6 py-2.5 font-display font-black text-sm card-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        >
          Rehberi İncele 📖
        </button>
      </div>
    </div>
  );
}
