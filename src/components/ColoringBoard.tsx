import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Paintbrush, 
  PaintBucket, 
  Eraser, 
  Undo2, 
  Redo2, 
  ArrowLeft, 
  Check, 
  Trash2, 
  Star, 
  Heart, 
  Download,
  PartyPopper
} from 'lucide-react';
import { Animal, ToolType, BrushType } from '../types';
import { COLORS } from '../data';
import { playBubblePop, playChimeSuccess, playToolSelect } from '../utils/audio';
import { getProxiedImageUrl } from '../utils/image';

interface ColoringBoardProps {
  animal: Animal;
  onSave: (title: string, dataUrl: string) => void;
  onBack: () => void;
}

export default function ColoringBoard({ animal, onSave, onBack }: ColoringBoardProps) {
  const [selectedColor, setSelectedColor] = useState('#ffd700');
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushType, setBrushType] = useState<BrushType>('marker');
  const [brushSize, setBrushSize] = useState(16);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTitle, setSuccessTitle] = useState(animal.name);

  // Confetti particles state
  const [particles, setParticles] = useState<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    type: 'circle' | 'square' | 'star' | 'heart';
    delay: number;
    rotate: number;
  }[]>([]);

  // Regenerate particles when the success modal is shown
  useEffect(() => {
    if (showSuccessModal) {
      const colors = ['#ffd700', '#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff6b81', '#70a1ff', '#eccc68'];
      const types: ('circle' | 'square' | 'star' | 'heart')[] = ['circle', 'square', 'star', 'heart'];
      const newParticles = Array.from({ length: 70 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        // Explode outward from center with some randomness
        const distance = 80 + Math.random() * 320;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - (40 + Math.random() * 120), // slight upward bias for gravity effect
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 12 + Math.random() * 22,
          type: types[Math.floor(Math.random() * types.length)],
          delay: Math.random() * 0.25,
          rotate: Math.random() * 720 - 360, // spins
        };
      });
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [showSuccessModal]);

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineArtImgRef = useRef<HTMLImageElement | null>(null);
  const lineArtImageDataRef = useRef<ImageData | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Load the line art for boundary checking
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = getProxiedImageUrl(animal.lineArtUrl);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          lineArtImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          console.warn('CORS or security error reading image data, bucket tool will use simplified fill', e);
        }
      }
    };
    img.onerror = () => {
      console.error('Failed to load line art image for coordinates mapping');
    };
  }, [animal]);

  // Handle canvas initialization and responsive sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Back up existing canvas data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize canvas
      canvas.width = width;
      canvas.height = height;

      // Draw backup back onto the resized canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        // Fill canvas with white initially
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      }
    };

    // Run initially
    resizeCanvas();

    // Observe size changes
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const saveCanvasToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setUndoStack(prev => [...prev, dataUrl]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.length === 0) return;

    playToolSelect();
    const prevStates = [...undoStack];
    const currentState = canvas.toDataURL();
    const prevState = prevStates.pop();

    setUndoStack(prevStates);
    setRedoStack(prev => [...prev, currentState]);

    if (prevState) {
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = prevState;
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
    }
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.length === 0) return;

    playToolSelect();
    const nextStates = [...redoStack];
    const nextState = nextStates.pop();
    const currentState = canvas.toDataURL();

    setUndoStack(prev => [...prev, currentState]);
    setRedoStack(nextStates);

    if (nextState) {
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = nextState;
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playToolSelect();
    saveCanvasToHistory();

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Coordinates helper
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if Touch Event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (activeTool === 'bucket') {
      handleBucketFill(e);
      return;
    }

    saveCanvasToHistory();
    isDrawingRef.current = true;
    const pos = getMousePos(e);
    lastPosRef.current = pos;

    // Draw single dot on click
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);

    if (activeTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = brushSize * 1.5;
    } else {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
    }

    // Apply brush style texture effects
    if (brushType === 'crayon' && activeTool !== 'eraser') {
      // Chalk/crayon pattern
      ctx.shadowColor = selectedColor;
      ctx.shadowBlur = 4;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
    lastPosRef.current = pos;

    // occasional popping sound for tactile brush feeling!
    if (Math.random() < 0.08) {
      playBubblePop();
    }
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  // Optimized Flood Fill on Canvas
  const handleBucketFill = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);
    const startX = Math.round(pos.x);
    const startY = Math.round(pos.y);

    // Ensure we are inside bounds
    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
      return;
    }

    saveCanvasToHistory();
    playBubblePop();

    // If we have local cached image data for lines, we map coordinates perfectly
    const lineArtData = lineArtImageDataRef.current;
    if (!lineArtData) {
      // Fallback: simple page fill if we cannot access outline coordinates
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Since lineArtData and onscreen canvas sizes can differ, we calculate ratios
    const ratioX = lineArtData.width / canvas.width;
    const ratioY = lineArtData.height / canvas.height;

    const imgX = Math.round(startX * ratioX);
    const imgY = Math.round(startY * ratioY);

    const canvasImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvasImgData.width;
    const height = canvasImgData.height;

    // Helper functions for Pixel Access
    const getOutlinePixel = (x: number, y: number) => {
      const mappedX = Math.min(Math.max(0, Math.round(x * ratioX)), lineArtData.width - 1);
      const mappedY = Math.min(Math.max(0, Math.round(y * ratioY)), lineArtData.height - 1);
      const i = (mappedY * lineArtData.width + mappedX) * 4;
      return {
        r: lineArtData.data[i],
        g: lineArtData.data[i + 1],
        b: lineArtData.data[i + 2],
        a: lineArtData.data[i + 3]
      };
    };

    const getCanvasPixel = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return {
        r: canvasImgData.data[i],
        g: canvasImgData.data[i + 1],
        b: canvasImgData.data[i + 2],
        a: canvasImgData.data[i + 3]
      };
    };

    // Parse fill color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 215, b: 0 };
    };

    const fillColor = hexToRgb(selectedColor);
    const targetPixelColor = getCanvasPixel(startX, startY);

    // If same color, do nothing to avoid infinite loops
    const colorTolerance = 15;
    const isSameColor = Math.abs(targetPixelColor.r - fillColor.r) < colorTolerance &&
                        Math.abs(targetPixelColor.g - fillColor.g) < colorTolerance &&
                        Math.abs(targetPixelColor.b - fillColor.b) < colorTolerance;

    if (isSameColor) return;

    // Is it clicking on a dark line art outline?
    const outlineColor = getOutlinePixel(startX, startY);
    const outlineLuminance = 0.299 * outlineColor.r + 0.587 * outlineColor.g + 0.114 * outlineColor.b;
    if (outlineLuminance < 130) {
      // Do not fill outline
      return;
    }

    // BFS Flood Fill using efficient index mapping
    const visited = new Uint8Array(width * height);
    const stack: number[] = [startX + startY * width];
    visited[startY * width + startX] = 1;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      const cx = idx % width;
      const cy = Math.floor(idx / width);

      // Set pixel in canvas image data
      const pixelIdx = idx * 4;
      canvasImgData.data[pixelIdx] = fillColor.r;
      canvasImgData.data[pixelIdx + 1] = fillColor.g;
      canvasImgData.data[pixelIdx + 2] = fillColor.b;
      canvasImgData.data[pixelIdx + 3] = 255;

      // Add neighbors (4-way)
      const dirs = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (const [nx, ny] of dirs) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = nx + ny * width;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;

            // Check if this neighbor is part of a dark outline
            const outCol = getOutlinePixel(nx, ny);
            const outLum = 0.299 * outCol.r + 0.587 * outCol.g + 0.114 * outCol.b;

            // Grayscale check - allow filling if outline pixel is light/white
            if (outLum >= 130) {
              // Check if neighbor on Canvas is close to the target color we started filling
              const canvCol = getCanvasPixel(nx, ny);
              const isCloseToTarget = Math.abs(canvCol.r - targetPixelColor.r) < 60 &&
                                      Math.abs(canvCol.g - targetPixelColor.g) < 60 &&
                                      Math.abs(canvCol.b - targetPixelColor.b) < 60;

              if (isCloseToTarget) {
                stack.push(nIdx);
              }
            }
          }
        }
      }
    }

    ctx.putImageData(canvasImgData, 0, 0);
  };

  const handleFinish = () => {
    playChimeSuccess();
    setShowSuccessModal(true);
  };

  const handleSaveToGallery = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a composite canvas containing the background paint and top line art merged
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = canvas.width;
    compositeCanvas.height = canvas.height;
    const compCtx = compositeCanvas.getContext('2d');

    if (compCtx) {
      // 1. Draw painted background
      compCtx.drawImage(canvas, 0, 0);

      // 2. Draw line art on top
      if (lineArtImgRef.current) {
        compCtx.globalCompositeOperation = 'multiply';
        compCtx.drawImage(lineArtImgRef.current, 0, 0, canvas.width, canvas.height);
      }
    }

    const dataUrl = compositeCanvas.toDataURL();
    onSave(successTitle, dataUrl);
    setShowSuccessModal(false);
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row relative min-h-[calc(100vh-100px)] h-full overflow-hidden select-none bg-[#f7f9ff]">
      
      {/* Top controls & Navigation (For Mobile) */}
      <div className="w-full md:hidden flex justify-between items-center bg-white border-b-4 border-black px-4 py-3 z-20">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-white card-shadow active:translate-x-[2px] active:translate-y-[2px]"
          id="btn-back-mobile"
        >
          <ArrowLeft size={20} className="stroke-black stroke-[3px]" />
        </button>
        <span className="font-display font-extrabold text-xl text-[#705d00] flex items-center gap-1">
          {animal.nameTr} 🎨
        </span>
        <button 
          onClick={handleFinish}
          className="bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-extrabold px-4 py-1.5 rounded-full border-2 border-black text-sm card-shadow active:translate-x-[2px] active:translate-y-[2px]"
          id="btn-done-mobile"
        >
          Bitti! ✨
        </button>
      </div>

      {/* Main Tools Panel */}
      <div className="w-full md:w-24 bg-[#e1f0ff] md:border-r-4 border-black md:h-full flex flex-row md:flex-col items-center justify-between md:justify-start gap-2.5 md:gap-3 p-3 md:py-6 z-10 select-none overflow-x-auto md:overflow-x-visible">
        {/* Desktop Back button */}
        <button 
          onClick={onBack}
          className="hidden md:flex w-14 h-14 rounded-full border-ink bg-white items-center justify-center card-shadow card-shadow-hover card-shadow-active text-black mb-8 cursor-pointer"
          id="btn-back-desktop"
          title="Geri Dön"
        >
          <ArrowLeft size={28} className="stroke-[3px]" />
        </button>

        {/* Brush Selector */}
        <button 
          onClick={() => { playToolSelect(); setActiveTool('brush'); }}
          className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl border-ink flex items-center justify-center transition-all ${activeTool === 'brush' ? 'bg-[#ffd700] translate-y-[-2px] shadow-[4px_4px_0px_0px_#000000]' : 'bg-white card-shadow hover:translate-y-[-2px]'}`}
          id="tool-brush"
          title="Fırça"
        >
          <Paintbrush size={24} className="md:size-8 text-black stroke-[2.5px]" />
        </button>

        {/* Bucket Fill Selector */}
        <button 
          onClick={() => { playToolSelect(); setActiveTool('bucket'); }}
          className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl border-ink flex items-center justify-center transition-all ${activeTool === 'bucket' ? 'bg-[#ffd700] translate-y-[-2px] shadow-[4px_4px_0px_0px_#000000]' : 'bg-white card-shadow hover:translate-y-[-2px]'}`}
          id="tool-bucket"
          title="Kova Dolgusu"
        >
          <PaintBucket size={24} className="md:size-8 text-black stroke-[2.5px]" />
        </button>

        {/* Eraser Selector */}
        <button 
          onClick={() => { playToolSelect(); setActiveTool('eraser'); }}
          className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl border-ink flex items-center justify-center transition-all ${activeTool === 'eraser' ? 'bg-[#ffd700] translate-y-[-2px] shadow-[4px_4px_0px_0px_#000000]' : 'bg-white card-shadow hover:translate-y-[-2px]'}`}
          id="tool-eraser"
          title="Silgi"
        >
          <Eraser size={24} className="md:size-8 text-black stroke-[2.5px]" />
        </button>

        <div className="hidden md:block w-full h-1 bg-black/10 my-4 rounded-full"></div>

        {/* Undo Action */}
        <button 
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-ink bg-white flex items-center justify-center card-shadow active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000000] transition-opacity ${undoStack.length === 0 ? 'opacity-40 cursor-not-allowed shadow-none active:translate-y-0' : 'cursor-pointer'}`}
          id="tool-undo"
          title="Geri Al"
        >
          <Undo2 size={20} className="md:size-6 text-black stroke-[2.5px]" />
        </button>

        {/* Redo Action */}
        <button 
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-ink bg-white flex items-center justify-center card-shadow active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000000] transition-opacity ${redoStack.length === 0 ? 'opacity-40 cursor-not-allowed shadow-none active:translate-y-0' : 'cursor-pointer'}`}
          id="tool-redo"
          title="Yinele"
        >
          <Redo2 size={20} className="md:size-6 text-black stroke-[2.5px]" />
        </button>

        {/* Clear/Reset Action */}
        <button 
          onClick={handleClear}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full border-ink bg-[#ffceca] flex items-center justify-center card-shadow card-shadow-hover card-shadow-active text-[#ba1724]"
          id="tool-clear"
          title="Temizle"
        >
          <Trash2 size={20} className="md:size-6 stroke-[2.5px]" />
        </button>
      </div>

      {/* Main Drawing Stage Area */}
      <div className="flex-1 flex flex-col p-4 md:p-8 select-none relative h-[calc(100vh-240px)] md:h-full">
        {/* Sub-Header Toolbar (Desktop only) */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-black">
              {animal.nameTr} Boyama Sayfası 🎨
            </h1>
            <p className="font-sans font-medium text-black/60 mt-1">
              Bir renk seç ve yaratıcılığını konuştur!
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Brush Size Slider */}
            {activeTool !== 'bucket' && (
              <div className="flex items-center gap-3 bg-white px-4 py-2 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000000]">
                <span className="font-display font-black text-xs">FIRÇA BOYUTU:</span>
                <input 
                  type="range" 
                  min="4" 
                  max="48" 
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-24 accent-[#ffd700] cursor-pointer"
                />
                <div 
                  className="rounded-full bg-black" 
                  style={{ width: `${Math.max(6, brushSize/2)}px`, height: `${Math.max(6, brushSize/2)}px` }}
                />
              </div>
            )}
            
            <button 
              onClick={handleFinish}
              className="bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-xl px-8 py-3 rounded-full border-ink shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              id="btn-done-desktop"
            >
              Tamamladım! ✨
            </button>
          </div>
        </div>

        {/* Dynamic Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 w-full bg-white border-ink-thick rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex items-center justify-center cursor-crosshair"
          id="coloring-stage-container"
        >
          {/* Bottom Layer Canvas: User Drawing */}
          <canvas 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute top-0 left-0 w-full h-full block bg-white"
            id="paint-canvas"
          />

          {/* Top Layer: Line Art Outlines */}
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

        {/* Bottom Swatch Selector */}
        <div className="mt-6 bg-[#e1f0ff] border-ink rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-4 select-none">
          {/* Brush/Eraser Thickness & Info Row */}
          {activeTool !== 'bucket' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-3">
                <span className="font-display font-black text-sm tracking-wide text-black flex items-center gap-1">
                  {activeTool === 'eraser' ? '🧽 SİLGİ KALINLIĞI:' : '🖌️ FIRÇA KALINLIĞI:'}
                </span>
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-black/20">
                  {brushSize}px
                </span>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input 
                  type="range" 
                  min="4" 
                  max="48" 
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="flex-1 sm:w-48 accent-[#ffd700] cursor-pointer h-2 bg-white rounded-lg border-2 border-black appearance-none"
                  id="brush-thickness-slider"
                />
                
                {/* Real-time brush size indicator dot */}
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0">
                  <div 
                    className="rounded-full bg-black transition-all" 
                    style={{ 
                      width: `${Math.min(36, Math.max(4, brushSize))}px`, 
                      height: `${Math.min(36, Math.max(4, brushSize))}px` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center px-1">
            <span className="font-display font-black text-sm tracking-wide text-black flex items-center gap-1.5">
              🌈 BİR RENK SEÇ:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-bold text-black/60">Aktif:</span>
              <div 
                className="w-5 h-5 rounded-full border-2 border-black"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-thin select-none">
            {COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => {
                  playBubblePop();
                  setSelectedColor(color.hex);
                }}
                className={`min-w-10 min-h-10 w-10 h-10 rounded-full border-2 border-black relative transition-all duration-150 transform hover:scale-110 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_#000000]`}
                style={{ backgroundColor: color.hex }}
                id={`color-swatch-${color.hex.substring(1)}`}
                title={color.name}
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
      </div>

      {/* Success Completion Modal Backdrop */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto overflow-hidden">
            {/* Confetti / Star Particles Burst */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
              {particles.map((p) => {
                const isStar = p.type === 'star';
                const isHeart = p.type === 'heart';
                const isCircle = p.type === 'circle';
                return (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{ 
                      x: p.x, 
                      y: p.y, 
                      scale: [0, 1.2, 0.8, 1, 0.5, 0],
                      opacity: [1, 1, 1, 0.8, 0.5, 0],
                      rotate: p.rotate 
                    }}
                    transition={{ 
                      duration: 1.8 + Math.random() * 1.2, 
                      delay: p.delay,
                      ease: [0.1, 0.8, 0.3, 1]
                    }}
                    style={{
                      position: 'absolute',
                      width: p.size,
                      height: p.size,
                      backgroundColor: (isStar || isHeart) ? undefined : p.color,
                      borderRadius: isCircle ? '50%' : p.type === 'square' ? '4px' : undefined,
                    }}
                  >
                    {isStar && (
                      <Star 
                        size={p.size} 
                        fill={p.color} 
                        className="text-black stroke-[1.5px]" 
                      />
                    )}
                    {isHeart && (
                      <Heart 
                        size={p.size} 
                        fill={p.color} 
                        className="text-black stroke-[1.5px]" 
                      />
                    )}
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
              {/* Confetti Background Stars */}
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

              <h2 className="font-display font-extrabold text-4xl text-black mb-1">
                Harika İş! 🎉
              </h2>
              <p className="font-sans font-medium text-black/60 mb-6">
                Şaheserin galeriye kaydedilmeye hazır!
              </p>

              {/* Title Input field with Playful Neobrutalism Border */}
              <div className="w-full mb-6">
                <label className="block text-left font-display font-black text-xs text-black mb-2 tracking-wide">
                  🎨 ÇALIŞMANA BİR AD VER:
                </label>
                <input 
                  type="text" 
                  value={successTitle}
                  onChange={(e) => setSuccessTitle(e.target.value)}
                  placeholder="Sevimli Aslanım"
                  className="w-full text-center font-display font-extrabold text-lg px-4 py-3 rounded-full border-ink bg-[#f7f9ff] text-black focus:outline-none focus:ring-4 focus:ring-[#ffd700] placeholder-black/40"
                  id="input-masterpiece-title"
                />
              </div>

              {/* Buttons Actions */}
              <div className="w-full flex flex-col gap-4">
                <button 
                  onClick={handleSaveToGallery}
                  className="w-full h-14 bg-[#ffd700] hover:bg-[#ffe16d] text-black font-display font-black text-lg border-ink rounded-full shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-save-masterpiece"
                >
                  <PartyPopper size={20} />
                  Galeriye Kaydet 🌟
                </button>

                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full h-14 bg-white hover:bg-slate-50 text-black font-display font-extrabold text-base border-ink rounded-full shadow-[2px_2px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                  id="btn-continue-coloring"
                >
                  Boyamaya Devam Et
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
