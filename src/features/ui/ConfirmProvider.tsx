import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ConfirmOptions {
  /** Optional heading. Falls back to a generic "Are you sure?" title. */
  title?: string;
  /** The body text explaining what will happen. */
  message: string;
  /** Label for the confirm button (e.g. "Delete"). */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to the shared cancel string. */
  cancelLabel?: string;
  /** Destructive styling (red confirm button + warning icon). */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// Fallback keeps call sites working even if the provider isn't mounted (degrades to window.confirm).
const ConfirmContext = createContext<ConfirmFn>(async (options) => window.confirm(options.message));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const settle = useCallback(
    (result: boolean) => {
      setPending((current) => {
        current?.resolve(result);
        return null;
      });
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog pending={pending} onSettle={settle} />
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ pending, onSettle }: { pending: PendingConfirm | null; onSettle: (result: boolean) => void }) {
  const { t } = useTranslation();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const open = pending !== null;

  useEffect(() => {
    if (!open) return;
    confirmButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSettle(false);
      if (event.key === 'Enter') onSettle(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onSettle]);

  const options = pending?.options;
  const danger = options?.danger ?? false;

  return (
    <AnimatePresence>
      {open && options && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onSettle(false)}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-sm bg-white border-ink-thick rounded-3xl p-6 shadow-[8px_8px_0px_0px_#000000]"
            initial={{ scale: 0.9, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`shrink-0 w-11 h-11 rounded-full border-ink flex items-center justify-center ${
                  danger ? 'bg-[#ffceca] text-[#ba1724]' : 'bg-[#e1f0ff] text-[#0001c0]'
                }`}
                aria-hidden
              >
                <AlertTriangle size={22} className="stroke-[2.5px]" />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-display font-black text-xl text-black">
                  {options.title ?? t('common.confirmTitle')}
                </h2>
                <p id="confirm-message" className="font-sans font-semibold text-black/60 mt-1 text-sm break-words">
                  {options.message}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => onSettle(false)}
                className="flex-1 bg-white border-ink rounded-full py-2.5 font-display font-black text-sm card-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                {options.cancelLabel ?? t('common.cancel')}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => onSettle(true)}
                className={`flex-1 border-ink rounded-full py-2.5 font-display font-black text-sm card-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                  danger ? 'bg-[#ba1724] text-white' : 'bg-[#ffd700] text-black'
                }`}
              >
                {options.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
