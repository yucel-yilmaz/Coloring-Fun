import { useState } from 'react';
import type { Animal, BrushType, ToolType } from '../types';
import { playChimeSuccess } from '../utils/audio';
import { useColoringCanvas } from '../features/coloring/useColoringCanvas';
import { BoardHeader, MobileHeader, ToolSidebar } from './coloring-board/BoardControls';
import { CanvasStage } from './coloring-board/CanvasStage';
import { ColorPalette } from './coloring-board/ColorPalette';
import { CompletionModal } from './coloring-board/CompletionModal';

interface ColoringBoardProps {
  animal: Animal;
  onSave: (title: string, dataUrl: string) => void | Promise<void>;
  onBack: () => void;
}

const DEFAULT_COLOR = '#ffd700';
const DEFAULT_BRUSH_TYPE: BrushType = 'marker';

export default function ColoringBoard({ animal, onSave, onBack }: ColoringBoardProps) {
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(16);
  const [brushType, setBrushType] = useState<BrushType>(DEFAULT_BRUSH_TYPE);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [masterpieceTitle, setMasterpieceTitle] = useState(animal.name);

  const canvas = useColoringCanvas({
    animal,
    selectedColor,
    activeTool,
    brushType,
    brushSize,
  });

  const handleFinish = () => {
    playChimeSuccess();
    setIsCompletionOpen(true);
  };

  const handleSave = async () => {
    const dataUrl = canvas.exportComposite();
    if (!dataUrl) return;
    await onSave(masterpieceTitle, dataUrl);
    setIsCompletionOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row relative h-dvh min-h-dvh overflow-x-hidden overflow-y-auto md:overflow-hidden select-none bg-[#f7f9ff]">
      <MobileHeader
        animalName={animal.nameTr}
        activeTool={activeTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        brushType={brushType}
        onBrushTypeChange={setBrushType}
        onBack={onBack}
        onFinish={handleFinish}
      />
      <ToolSidebar
        activeTool={activeTool}
        canUndo={canvas.canUndo}
        canRedo={canvas.canRedo}
        onBack={onBack}
        onToolChange={setActiveTool}
        onUndo={canvas.undo}
        onRedo={canvas.redo}
        onClear={canvas.clear}
      />

      <div className="flex-1 min-h-[500px] md:min-h-0 flex flex-col p-4 md:p-8 select-none relative">
        <BoardHeader
          animalName={animal.nameTr}
          activeTool={activeTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          brushType={brushType}
          onBrushTypeChange={setBrushType}
          onFinish={handleFinish}
        />
        <CanvasStage
          animal={animal}
          containerRef={canvas.containerRef}
          canvasRef={canvas.canvasRef}
          lineArtImgRef={canvas.lineArtImgRef}
          onPointerDown={canvas.startDrawing}
          onPointerMove={canvas.draw}
          onPointerUp={canvas.stopDrawing}
        />
        <ColorPalette
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
      </div>

      <CompletionModal
        open={isCompletionOpen}
        title={masterpieceTitle}
        onTitleChange={setMasterpieceTitle}
        onSave={handleSave}
        onClose={() => setIsCompletionOpen(false)}
      />
    </div>
  );
}
