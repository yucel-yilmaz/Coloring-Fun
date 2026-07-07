import { ArrowLeft, Eraser, Paintbrush, PaintBucket, Redo2, Trash2, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ToolType } from '../../types';
import { playToolSelect } from '../../utils/audio';

interface MobileHeaderProps {
  animalName: string;
  onBack: () => void;
  onFinish: () => void;
}

export function MobileHeader({ animalName, onBack, onFinish }: MobileHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="w-full md:hidden flex justify-between items-center bg-white border-b-4 border-black px-4 py-3 z-20">
      <button
        onClick={onBack}
        className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-white card-shadow active:translate-x-0.5 active:translate-y-0.5"
        id="btn-back-mobile"
      >
        <ArrowLeft size={20} className="stroke-black stroke-[3px]" />
      </button>
      <span className="font-display font-extrabold text-xl text-[#705d00] flex items-center gap-1">
        {animalName} 🎨
      </span>
      <button
        onClick={onFinish}
        className="bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-extrabold px-4 py-1.5 rounded-full border-2 border-black text-sm card-shadow active:translate-x-0.5 active:translate-y-[2px]"
        id="btn-done-mobile"
      >
        {t('board.mobileDone')}
      </button>
    </div>
  );
}

interface ToolSidebarProps {
  activeTool: ToolType;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export function ToolSidebar({
  activeTool,
  canUndo,
  canRedo,
  onBack,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
}: ToolSidebarProps) {
  const { t } = useTranslation();
  const selectTool = (tool: ToolType) => {
    playToolSelect();
    onToolChange(tool);
  };
  const toolClass = (tool: ToolType) =>
    `w-12 h-12 md:w-16 md:h-16 rounded-2xl border-ink flex items-center justify-center transition-all ${
      activeTool === tool
        ? 'bg-[#ffd700] -translate-y-0.5 shadow-[4px_4px_0px_0px_#000000]'
        : 'bg-white card-shadow hover:-translate-y-0.5'
    }`;
  const historyClass = (enabled: boolean) =>
    `w-12 h-12 md:w-14 md:h-14 rounded-full border-ink bg-white flex items-center justify-center card-shadow active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000000] transition-opacity ${
      enabled ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed shadow-none active:translate-y-0'
    }`;

  return (
    <div className="w-full md:w-24 bg-[#e1f0ff] md:border-r-4 border-black md:h-full flex flex-row md:flex-col items-center justify-between md:justify-start gap-2.5 md:gap-3 p-3 md:py-6 z-10 select-none overflow-x-auto md:overflow-x-visible">
      <button
        onClick={onBack}
        className="hidden md:flex w-14 h-14 rounded-full border-ink bg-white items-center justify-center card-shadow card-shadow-hover card-shadow-active text-black mb-8 cursor-pointer"
        id="btn-back-desktop"
        title={t('common.back')}
      >
        <ArrowLeft size={28} className="stroke-[3px]" />
      </button>

      <button onClick={() => selectTool('brush')} className={toolClass('brush')} id="tool-brush" title={t('board.brush')}>
        <Paintbrush size={24} className="md:size-8 text-black stroke-[2.5px]" />
      </button>
      <button onClick={() => selectTool('bucket')} className={toolClass('bucket')} id="tool-bucket" title={t('board.bucket')}>
        <PaintBucket size={24} className="md:size-8 text-black stroke-[2.5px]" />
      </button>
      <button onClick={() => selectTool('eraser')} className={toolClass('eraser')} id="tool-eraser" title={t('board.eraser')}>
        <Eraser size={24} className="md:size-8 text-black stroke-[2.5px]" />
      </button>

      <div className="hidden md:block w-full h-1 bg-black/10 my-4 rounded-full" />
      <button onClick={onUndo} disabled={!canUndo} className={historyClass(canUndo)} id="tool-undo" title={t('board.undo')}>
        <Undo2 size={20} className="md:size-6 text-black stroke-[2.5px]" />
      </button>
      <button onClick={onRedo} disabled={!canRedo} className={historyClass(canRedo)} id="tool-redo" title={t('board.redo')}>
        <Redo2 size={20} className="md:size-6 text-black stroke-[2.5px]" />
      </button>
      <button
        onClick={onClear}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full border-ink bg-[#ffceca] flex items-center justify-center card-shadow card-shadow-hover card-shadow-active text-[#ba1724]"
        id="tool-clear"
        title={t('board.clear')}
      >
        <Trash2 size={20} className="md:size-6 stroke-[2.5px]" />
      </button>
    </div>
  );
}

interface BoardHeaderProps {
  animalName: string;
  activeTool: ToolType;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onFinish: () => void;
}

export function BoardHeader({
  animalName,
  activeTool,
  brushSize,
  onBrushSizeChange,
  onFinish,
}: BoardHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="hidden md:flex justify-between items-center mb-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-black">{t('board.pageTitle', { name: animalName })}</h1>
        <p className="font-sans font-medium text-black/60 mt-1">{t('board.pageDesc')}</p>
      </div>
      <div className="flex items-center gap-4">
        {activeTool !== 'bucket' && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000000]">
            <span className="font-display font-black text-xs">{t('board.brushSize')}</span>
            <input
              type="range"
              min="4"
              max="48"
              value={brushSize}
              onChange={(event) => onBrushSizeChange(Number(event.target.value))}
              className="w-24 accent-[#ffd700] cursor-pointer"
            />
            <div
              className="rounded-full bg-black"
              style={{ width: Math.max(6, brushSize / 2), height: Math.max(6, brushSize / 2) }}
            />
          </div>
        )}
        <button
          onClick={onFinish}
          className="bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-xl px-8 py-3 rounded-full border-ink shadow-[4px_4px_0px_0px_#000000] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
          id="btn-done-desktop"
        >
          {t('board.done')}
        </button>
      </div>
    </div>
  );
}
