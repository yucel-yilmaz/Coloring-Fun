import { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  HelpCircle, 
  Palette, 
  Check, 
  RefreshCw,
  Sparkles,
  Heart
} from 'lucide-react';
import { playBubblePop, playToolSelect } from '../utils/audio';

interface SettingsPanelProps {
  onResetGallery?: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export default function SettingsPanel({ onResetGallery, soundEnabled, onToggleSound }: SettingsPanelProps) {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    if (!onResetGallery) return;
    playToolSelect();
    onResetGallery();
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
    }, 2000);
  };

  const handleSoundToggle = () => {
    playBubblePop();
    onToggleSound(!soundEnabled);
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 md:px-12 py-8 pb-32 animate-pop select-none">
      <div className="border-b-4 border-black pb-6 mb-8">
        <h2 className="font-display font-extrabold text-4xl text-black">
          Ayarlar ve Rehber ⚙️
        </h2>
        <p className="font-sans font-semibold text-black/60 mt-1">
          Uygulama tercihlerini yönet ve nasıl oynanacağını öğren!
        </p>
      </div>

      <div className="space-y-8">
        {/* Preference Settings Section */}
        <div className="bg-white border-ink-thick rounded-3xl p-6 shadow-[6px_6px_0px_0px_#000000]">
          <h3 className="font-display font-black text-xl text-black mb-4 flex items-center gap-2">
            <Palette size={20} /> Oyun Tercihleri
          </h3>

          <div className="space-y-4">
            {/* Sound Toggles */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-display font-black text-base text-black block">
                  Baloncuk Sesleri
                </span>
                <span className="font-sans font-medium text-xs text-black/55">
                  Renk seçerken veya çizerken neşeli sesleri aç/kapa.
                </span>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`w-14 h-14 rounded-full border-2 border-black flex items-center justify-center transition-all card-shadow ${
                  soundEnabled ? 'bg-[#ffd700]' : 'bg-slate-100 text-slate-400'
                }`}
                id="btn-toggle-sound"
              >
                {soundEnabled ? (
                  <Volume2 size={24} className="stroke-black stroke-[2.5px]" />
                ) : (
                  <VolumeX size={24} className="stroke-slate-400 stroke-[2px]" />
                )}
              </button>
            </div>

            {onResetGallery && <><hr className="border-black/10" />
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-display font-black text-base text-black block">
                  Galeriyi Sıfırla
                </span>
                <span className="font-sans font-medium text-xs text-black/55">
                  Tüm boyamalarını sil ve varsayılan şaheserleri geri yükle.
                </span>
              </div>
              <button
                onClick={handleReset}
                className="px-5 py-3 rounded-full border-2 border-black bg-[#ffceca] hover:bg-[#ffb3ae] text-[#ba1724] font-display font-black text-sm flex items-center gap-1.5 transition-all card-shadow card-shadow-hover card-shadow-active cursor-pointer"
                id="btn-reset-gallery"
              >
                {resetSuccess ? (
                  <>
                    <Check size={16} className="stroke-[3px]" /> Sıfırlandı
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} className="stroke-[3px]" /> Sıfırla
                  </>
                )}
              </button>
            </div></>}
          </div>
        </div>

        {/* How to play instruction card for kids and parents */}
        <div className="bg-[#e1f0ff] border-ink-thick rounded-3xl p-6 shadow-[6px_6px_0px_0px_#000000]">
          <h3 className="font-display font-black text-xl text-black mb-4 flex items-center gap-2">
            <HelpCircle size={20} /> Nasıl Oynanır?
          </h3>

          <div className="space-y-4 font-sans font-bold text-sm text-black/80">
            <div className="flex items-start gap-3">
              <div className="bg-[#ffd700] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center font-display font-black shrink-0">
                1
              </div>
              <p className="mt-1">
                Ana sayfadan boyamak istediğin sevimli bir <span className="text-[#705d00] font-black">hayvan dostunu</span> seç!
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#ffd700] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center font-display font-black shrink-0">
                2
              </div>
              <p className="mt-1">
                Sol taraftaki menüden <span className="font-black">Fırça 🖌️</span> veya <span className="font-black">Boya Kovası 🪣</span> aracını seç!
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#ffd700] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center font-display font-black shrink-0">
                3
              </div>
              <p className="mt-1">
                Alt taraftaki renk paletinden <span className="text-[#0001c0] font-black">en sevdiğin rengi</span> seçerek dokun!
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#ffd700] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center font-display font-black shrink-0">
                4
              </div>
              <p className="mt-1">
                Görselin üzerine parmağınla veya farenle dokunarak boyamaya başla!
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#ffd700] border-2 border-black rounded-full w-8 h-8 flex items-center justify-center font-display font-black shrink-0">
                5
              </div>
              <p className="mt-1">
                Tamamladığında <span className="text-green-600 font-black">Bitti ✨</span> butonuna tıkla, esere isim ver ve Galeriye kaydet!
              </p>
            </div>
          </div>
        </div>

        {/* Fun info card */}
        <div className="bg-white border-ink rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000000] text-center">
          <p className="font-display font-extrabold text-sm text-black flex items-center justify-center gap-1.5">
            Coloring Fun! ile yaratıcılığın sınırlarını zorla! <Sparkles size={16} className="text-[#ffd700] fill-[#ffd700]" />
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs font-sans font-bold text-black/40">
            <span>Sevgiyle yapıldı</span> <Heart size={12} fill="#ba1724" className="stroke-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
