import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Animal, BrushType, ToolType } from '../../types';
import { playBubblePop, playToolSelect } from '../../utils/audio';
import { getProxiedImageUrl } from '../../utils/image';
import { createLineArtMask, floodFill, type CachedLineArtMask } from './canvasUtils';

type CanvasPointerEvent =
  | React.MouseEvent<HTMLCanvasElement>
  | React.TouchEvent<HTMLCanvasElement>;

interface UseColoringCanvasOptions {
  animal: Animal;
  selectedColor: string;
  activeTool: ToolType;
  brushType: BrushType;
  brushSize: number;
}

const MAX_CANVAS_DIMENSION = 1600;

function restoreCanvas(canvas: HTMLCanvasElement, dataUrl: string) {
  const context = canvas.getContext('2d');
  const image = new Image();
  image.src = dataUrl;
  image.onload = () => {
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
  };
}

export function useColoringCanvas({
  animal,
  selectedColor,
  activeTool,
  brushType,
  brushSize,
}: UseColoringCanvasOptions) {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineArtImgRef = useRef<HTMLImageElement>(null);
  const lineArtSourceRef = useRef<HTMLImageElement | null>(null);
  const lineArtMaskRef = useRef<CachedLineArtMask | null>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.src = getProxiedImageUrl(animal.lineArtUrl);
    image.onload = () => {
      lineArtSourceRef.current = image;
      lineArtMaskRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resolutionScale = Math.min(
        1,
        MAX_CANVAS_DIMENSION / image.naturalWidth,
        MAX_CANVAS_DIMENSION / image.naturalHeight,
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * resolutionScale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * resolutionScale));

      const context = canvas.getContext('2d');
      if (!context) return;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
    image.onerror = () => console.error('Failed to load line art image for coordinates mapping');
  }, [animal]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUndoStack((states) => [...states, canvas.toDataURL()]);
    setRedoStack([]);
  };

  const getPosition = (event: CanvasPointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1, displayScale: 1 };
    const rect = canvas.getBoundingClientRect();

    const renderedScale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const renderedWidth = canvas.width * renderedScale;
    const renderedHeight = canvas.height * renderedScale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    let clientX: number;
    let clientY: number;

    if ('touches' in event) {
      if (event.touches.length === 0) return { x: -1, y: -1, displayScale: renderedScale };
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left - offsetX) / renderedScale,
      y: (clientY - rect.top - offsetY) / renderedScale,
      displayScale: renderedScale,
    };
  };

  const getLineArtMask = (canvas: HTMLCanvasElement) => {
    const cached = lineArtMaskRef.current;
    if (cached?.width === canvas.width && cached.height === canvas.height) return cached.data;
    const image = lineArtSourceRef.current;
    if (!image) return null;
    const mask = createLineArtMask(canvas, image);
    lineArtMaskRef.current = mask;
    return mask?.data ?? null;
  };

  const fillArea = (event: CanvasPointerEvent) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const position = getPosition(event);
    const startX = Math.round(position.x);
    const startY = Math.round(position.y);
    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;

    const mask = getLineArtMask(canvas);
    if (!mask) return;
    saveToHistory();
    playBubblePop();
    floodFill(context, mask, startX, startY, selectedColor);
  };

  const draw = (event: CanvasPointerEvent) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    const position = getPosition(event);

    context.beginPath();
    context.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
    context.lineTo(position.x, position.y);
    context.strokeStyle = activeTool === 'eraser' ? '#ffffff' : selectedColor;
    const displayedBrushSize = activeTool === 'eraser' ? brushSize * 1.5 : brushSize;
    context.lineWidth = displayedBrushSize / position.displayScale;
    context.shadowColor = selectedColor;
    context.shadowBlur = brushType === 'crayon' && activeTool !== 'eraser' ? 4 : 0;
    context.stroke();
    lastPositionRef.current = position;
    if (Math.random() < 0.08) playBubblePop();
  };

  const startDrawing = (event: CanvasPointerEvent) => {
    event.preventDefault();
    if (activeTool === 'bucket') {
      fillArea(event);
      return;
    }
    saveToHistory();
    isDrawingRef.current = true;
    lastPositionRef.current = getPosition(event);
    draw(event);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.length === 0) return;
    playToolSelect();
    const previousStates = [...undoStack];
    const previousState = previousStates.pop();
    setUndoStack(previousStates);
    setRedoStack((states) => [...states, canvas.toDataURL()]);
    if (previousState) restoreCanvas(canvas, previousState);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.length === 0) return;
    playToolSelect();
    const nextStates = [...redoStack];
    const nextState = nextStates.pop();
    setUndoStack((states) => [...states, canvas.toDataURL()]);
    setRedoStack(nextStates);
    if (nextState) restoreCanvas(canvas, nextState);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    playToolSelect();
    saveToHistory();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const exportComposite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const composite = document.createElement('canvas');
    composite.width = canvas.width;
    composite.height = canvas.height;
    const context = composite.getContext('2d');
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
    if (lineArtImgRef.current) {
      context.globalCompositeOperation = 'multiply';
      context.drawImage(lineArtImgRef.current, 0, 0, canvas.width, canvas.height);
    }
    return composite.toDataURL();
  };

  return {
    containerRef,
    canvasRef,
    lineArtImgRef,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    clear,
    exportComposite,
  };
}
