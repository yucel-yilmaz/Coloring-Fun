import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../data';
import { playBubblePop } from '../../utils/audio';

interface ColorPaletteProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export function ColorPalette({
  selectedColor,
  onColorChange,
}: ColorPaletteProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  return (
    <div className="mt-6 bg-[#e1f0ff] border-ink rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-4 select-none">
      <div className="flex justify-between items-center px-1">
        <span className="font-display font-black text-sm tracking-wide text-black flex items-center gap-1.5">{t('board.pickColor')}</span>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs font-bold text-black/60">{t('board.active')}</span>
          <div className="w-5 h-5 rounded-full border-2 border-black" style={{ backgroundColor: selectedColor }} />
        </div>
      </div>

      <div role="radiogroup" aria-label={t('board.pickColor')} className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-thin select-none">
        {COLORS.map((color) => (
          <button
            key={color.hex}
            onClick={() => {
              playBubblePop();
              onColorChange(color.hex);
            }}
            role="radio"
            aria-checked={selectedColor === color.hex}
            aria-label={isEnglish ? color.nameEn : color.name}
            className="min-w-10 min-h-10 w-10 h-10 rounded-full border-2 border-black relative transition-all duration-150 transform hover:scale-110 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_#000000]"
            style={{ backgroundColor: color.hex }}
            id={`color-swatch-${color.hex.substring(1)}`}
            title={isEnglish ? color.nameEn : color.name}
          >
            {selectedColor === color.hex && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center">
                  <Check size={12} className="stroke-black stroke-[4px]" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
