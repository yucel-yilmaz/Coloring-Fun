import { useEffect, useRef } from 'react';
import { ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Animal } from '../../types';
import type { CategoryTab } from '../../features/app/categories';
import { getProxiedImageUrl } from '../../utils/image';

interface AnimalSelectionProps {
  animals: Animal[];
  activeCategory: string;
  categories: CategoryTab[];
  isLoading: boolean;
  onCategoryChange: (category: string) => void;
  onSelectAnimal: (animal: Animal) => void;
  onCreate: () => void;
  onOpenGuide: () => void;
}

const SKELETON_COUNT = 8;

export function AnimalSelection({
  animals,
  activeCategory,
  categories,
  isLoading,
  onCategoryChange,
  onSelectAnimal,
  onCreate,
  onOpenGuide,
}: AnimalSelectionProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  // Keep the selected chip visible when the row overflows (mobile, or the extra Space tab).
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  const showSkeleton = isLoading && animals.length === 0;
  const showEmpty = !isLoading && animals.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-8 md:py-12 pb-32 animate-pop">
      <div className="mb-8 text-left">
        <h2 className="font-display font-extrabold text-4xl md:text-5xl text-black tracking-tight leading-none">
          {t('animalSelection.title')}
        </h2>
        <p className="font-sans font-semibold text-black/60 mt-3 text-lg md:text-xl">
          {t('animalSelection.desc')}
        </p>
      </div>

      {/* Sticky category bar, sitting flush below the sticky app header (header is 72px tall). */}
      <div className="sticky top-[72px] z-30 -mx-6 md:-mx-12 px-6 md:px-12 py-3 mb-6 bg-[#f7f9ff]/95 backdrop-blur-sm">
        <div className="relative">
          {/* Edge fades hint that the row scrolls horizontally. */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#f7f9ff] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#f7f9ff] to-transparent z-10" />
          <div
            ref={scrollerRef}
            role="tablist"
            aria-label={t('animalSelection.categoriesLabel')}
            // overflow-x-auto forces overflow-y to auto, which would clip the chips' hover lift and
            // their hard offset shadows — so pad on every side to give both room to render.
            className="flex gap-3 overflow-x-auto scrollbar-none px-1.5 pt-1.5 pb-2.5"
          >
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  ref={isActive ? activeChipRef : undefined}
                  onClick={() => onCategoryChange(category.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`shrink-0 flex items-center gap-2 pl-4 pr-3 py-2.5 font-display font-black text-sm rounded-full border-2 border-black cursor-pointer transition-all ${
                    isActive
                      ? `${category.activeClass} -translate-y-0.5 shadow-[3px_3px_0px_0px_#000000]`
                      : 'bg-white card-shadow hover:-translate-y-0.5'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">{category.emoji}</span>
                  <span>{category.label}</span>
                  <span
                    className={`min-w-6 text-center text-xs rounded-full px-1.5 py-0.5 border-2 border-black ${
                      isActive ? 'bg-white' : 'bg-black/5'
                    }`}
                  >
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!showEmpty && !showSkeleton && (
        <p className="font-sans font-bold text-black/40 text-sm mb-4">
          {t('animalSelection.resultCount', { count: animals.length })}
        </p>
      )}

      {showSkeleton && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <div key={index} className="bg-white border-ink-thick rounded-[32px] p-4.5 card-shadow">
              <div className="bg-black/5 rounded-2xl border-ink aspect-square mb-4 animate-pulse" />
              <div className="flex items-center justify-between px-2">
                <span className="h-5 w-24 rounded-full bg-black/10 animate-pulse" />
                <span className="w-9 h-9 rounded-full bg-black/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="bg-white border-ink-thick rounded-[32px] p-10 card-shadow flex flex-col items-center text-center gap-3">
          <span className="text-5xl" aria-hidden>🎨</span>
          <h3 className="font-display font-black text-2xl text-black">{t('animalSelection.emptyTitle')}</h3>
          <p className="font-sans font-semibold text-black/50 max-w-sm">{t('animalSelection.emptyDesc')}</p>
          <button
            onClick={onCreate}
            className="mt-2 bg-[#ffd700] hover:bg-[#ffe16d] border-ink rounded-full px-6 py-3 font-display font-black text-sm card-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles size={18} className="stroke-[3px]" />
            {t('animalSelection.emptyCta')}
          </button>
        </div>
      )}

      {!showEmpty && !showSkeleton && (
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
      )}

      <div className="mt-14 bg-white border-ink rounded-3xl p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#e1f0ff] flex items-center justify-center text-[#0001c0] shrink-0 border-2 border-black">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="font-display font-black text-lg text-black">{t('animalSelection.guideTitle')}</h4>
            <p className="font-sans font-semibold text-black/50 text-sm">{t('animalSelection.guideDesc')}</p>
          </div>
        </div>
        <button
          onClick={onOpenGuide}
          className="bg-[#cbe6ff] hover:bg-[#badeff] border-2 border-black rounded-full px-6 py-2.5 font-display font-black text-sm card-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        >
          {t('animalSelection.guideButton')}
        </button>
      </div>
    </div>
  );
}
