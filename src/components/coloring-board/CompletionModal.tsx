import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, PartyPopper, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ParticleType = 'circle' | 'square' | 'star' | 'heart';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  type: ParticleType;
  delay: number;
  rotate: number;
}

interface CompletionModalProps {
  open: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function createParticles(): Particle[] {
  const colors = ['#ffd700', '#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff6b81', '#70a1ff', '#eccc68'];
  const types: ParticleType[] = ['circle', 'square', 'star', 'heart'];
  return Array.from({ length: 70 }, (_, id) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 320;
    return {
      id,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - (40 + Math.random() * 120),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 12 + Math.random() * 22,
      type: types[Math.floor(Math.random() * types.length)],
      delay: Math.random() * 0.25,
      rotate: Math.random() * 720 - 360,
    };
  });
}

export function CompletionModal({ open, title, onTitleChange, onSave, onClose }: CompletionModalProps) {
  const { t } = useTranslation();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(open ? createParticles() : []);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto overflow-x-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
            {particles.map((particle) => {
              const isStar = particle.type === 'star';
              const isHeart = particle.type === 'heart';
              return (
                <motion.div
                  key={particle.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: particle.x,
                    y: particle.y,
                    scale: [0, 1.2, 0.8, 1, 0.5, 0],
                    opacity: [1, 1, 1, 0.8, 0.5, 0],
                    rotate: particle.rotate,
                  }}
                  transition={{
                    duration: 1.8 + Math.random() * 1.2,
                    delay: particle.delay,
                    ease: [0.1, 0.8, 0.3, 1],
                  }}
                  style={{
                    position: 'absolute',
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: isStar || isHeart ? undefined : particle.color,
                    borderRadius: particle.type === 'circle' ? '50%' : particle.type === 'square' ? '4px' : undefined,
                  }}
                >
                  {isStar && <Star size={particle.size} fill={particle.color} className="text-black stroke-[1.5px]" />}
                  {isHeart && <Heart size={particle.size} fill={particle.color} className="text-black stroke-[1.5px]" />}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white border-ink-thick rounded-[32px] shadow-[8px_8px_0px_0px_#000000] w-full max-w-md p-6 md:p-8 text-center flex flex-col items-center relative overflow-hidden"
            id="success-completion-modal"
          >
            <div className="absolute top-4 left-4 animate-float text-[#ffd700]">
              <Star size={36} fill="#ffd700" className="stroke-black stroke-[2px]" />
            </div>
            <div className="absolute top-10 right-4 animate-float text-[#ffceca] [animation-delay:1.5s]">
              <Heart size={28} fill="#ffceca" className="stroke-black stroke-[2px]" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[#ffd700] mb-4">
              <Star size={24} fill="#ffd700" className="stroke-black stroke-[2px]" />
              <Star size={36} fill="#ffd700" className="stroke-black stroke-[2px] -translate-y-1" />
              <Star size={24} fill="#ffd700" className="stroke-black stroke-[2px]" />
            </div>

            <h2 className="font-display font-extrabold text-4xl text-black mb-1">{t('board.completionTitle')}</h2>
            <p className="font-sans font-medium text-black/60 mb-6">{t('board.completionDesc')}</p>
            <div className="w-full mb-6">
              <label className="block text-left font-display font-black text-xs text-black mb-2 tracking-wide">
                {t('board.nameYourWork')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={t('board.titlePlaceholder')}
                className="w-full text-center font-display font-extrabold text-lg px-4 py-3 rounded-full border-ink bg-[#f7f9ff] text-black focus:outline-none focus:ring-4 focus:ring-[#ffd700] placeholder-black/40"
                id="input-masterpiece-title"
              />
            </div>
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={onSave}
                className="w-full h-14 bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-lg border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-save-masterpiece"
              >
                <PartyPopper size={20} />
                {t('board.saveToGallery')}
              </button>
              <button
                onClick={onClose}
                className="w-full h-14 bg-white hover:bg-slate-50 text-black font-display font-extrabold text-base border-ink rounded-full shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                id="btn-continue-coloring"
              >
                {t('board.continueColoring')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
