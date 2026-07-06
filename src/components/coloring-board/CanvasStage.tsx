import type React from 'react';
import type { Animal } from '../../types';
import { getProxiedImageUrl } from '../../utils/image';

interface CanvasStageProps {
  animal: Animal;
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  lineArtImgRef: React.RefObject<HTMLImageElement | null>;
  onMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  onMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  onTouchStart: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchMove: React.TouchEventHandler<HTMLCanvasElement>;
  onTouchEnd: React.TouchEventHandler<HTMLCanvasElement>;
}

export function CanvasStage({
  animal,
  containerRef,
  canvasRef,
  lineArtImgRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: CanvasStageProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-56 w-full bg-white border-ink-thick rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex items-center justify-center cursor-crosshair"
      id="coloring-stage-container"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="absolute inset-0 w-full h-full block object-contain touch-none"
        id="paint-canvas"
      />
      <img
        ref={lineArtImgRef}
        src={getProxiedImageUrl(animal.lineArtUrl)}
        alt={animal.name}
        referrerPolicy="no-referrer"
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none select-none mix-blend-multiply opacity-95"
        crossOrigin="anonymous"
        id="line-art-top-layer"
      />
    </div>
  );
}
