import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Animal, BrushType, ToolType } from '../../types';
import { playBubblePop, playToolSelect } from '../../utils/audio';
import { getProxiedImageUrl } from '../../utils/image';
import { createLineArtMask, floodFill, type CachedLineArtMask } from './canvasUtils';
import { createBrushEngine, type StrokeSample } from './brushEngine';

interface UseColoringCanvasOptions {
  animal: Animal;
  selectedColor: string;
  activeTool: ToolType;
  brushType: BrushType;
  brushSize: number;
}

const MAX_CANVAS_DIMENSION = 1600;

/**
 * Synchronous by design (unlike a toDataURL()+Image()+onload round-trip): undo/redo read and
 * write the canvas back-to-back, and an async restore let rapid clicks read stale pixels,
 * corrupting the history stacks and making undo silently skip a step.
 */
function restoreCanvas(canvas: HTMLCanvasElement, snapshot: ImageData) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.putImageData(snapshot, 0, 0);
}

export function useColoringCanvas({
  animal,
  selectedColor,
  activeTool,
  brushType,
  brushSize,
}: UseColoringCanvasOptions) {
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineArtImgRef = useRef<HTMLImageElement>(null);
  const lineArtSourceRef = useRef<HTMLImageElement | null>(null);
  const lineArtMaskRef = useRef<CachedLineArtMask | null>(null);
  const isDrawingRef = useRef(false);

  const engineRef = useRef(createBrushEngine());
  const pendingRef = useRef<StrokeSample[]>([]);
  const rafRef = useRef<number | null>(null);
  // Velocity-derived pressure fallback for mouse/finger (no real stylus pressure).
  const lastSampleRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pseudoPressureRef = useRef(0.5);

  // Keep the latest drawing config in a ref so the rAF loop and pointer handlers,
  // which are created once, always read current values without re-binding listeners.
  const configRef = useRef({ selectedColor, activeTool, brushType, brushSize });
  configRef.current = { selectedColor, activeTool, brushType, brushSize };

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

  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return null;
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const saveToHistory = () => {
    const snapshot = captureSnapshot();
    if (!snapshot) return;
    setUndoStack((states) => [...states, snapshot]);
    setRedoStack([]);
  };

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1, displayScale: 1 };
    const rect = canvas.getBoundingClientRect();
    const renderedScale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const offsetX = (rect.width - canvas.width * renderedScale) / 2;
    const offsetY = (rect.height - canvas.height * renderedScale) / 2;
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

  const fillArea = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const position = toCanvasPoint(clientX, clientY);
    const startX = Math.round(position.x);
    const startY = Math.round(position.y);
    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;

    const mask = getLineArtMask(canvas);
    if (!mask) return;
    saveToHistory();
    playBubblePop();
    floodFill(context, mask, startX, startY, configRef.current.selectedColor);
  };

  /** Convert one raw pointer event into an engine sample, deriving pressure when the device lacks it. */
  const toStrokeSample = (
    clientX: number,
    clientY: number,
    pointerType: string,
    pressure: number,
  ): StrokeSample => {
    const point = toCanvasPoint(clientX, clientY);
    let effective: number;
    if (pointerType === 'pen' && pressure > 0) {
      // Lift light stylus touches into a usable range.
      effective = 0.2 + 0.8 * pressure;
    } else {
      const now = performance.now();
      const last = lastSampleRef.current;
      if (last) {
        const dt = Math.max(1, now - last.time);
        const speed = Math.hypot(clientX - last.x, clientY - last.y) / dt; // px per ms
        const target = Math.max(0.15, Math.min(1, 1 - speed / 1.6));
        pseudoPressureRef.current = pseudoPressureRef.current * 0.65 + target * 0.35;
      }
      lastSampleRef.current = { x: clientX, y: clientY, time: now };
      effective = pseudoPressureRef.current;
    }
    return { x: point.x, y: point.y, pressure: effective };
  };

  const currentStrokeParams = (displayScale: number) => {
    const { selectedColor: color, activeTool: tool, brushType: brush, brushSize: size } = configRef.current;
    const isEraser = tool === 'eraser';
    const scaledSize = (isEraser ? size * 1.5 : size) / displayScale;
    return { brushType: brush, isEraser, color, size: scaledSize };
  };

  const runFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) {
      rafRef.current = null;
      return;
    }
    const engine = engineRef.current;
    const pending = pendingRef.current;
    if (pending.length > 0) {
      pendingRef.current = [];
      engine.addSamples(canvas, pending);
      if (Math.random() < 0.06) playBubblePop();
    } else if (engine.isSpray()) {
      engine.tickDwell(canvas);
    }
    rafRef.current = requestAnimationFrame(runFrame);
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (configRef.current.activeTool === 'bucket') {
      fillArea(event.clientX, event.clientY);
      return;
    }

    saveToHistory();
    const { displayScale } = toCanvasPoint(event.clientX, event.clientY);
    const params = currentStrokeParams(displayScale);
    engineRef.current.beginStroke(canvas, params);

    lastSampleRef.current = null;
    pseudoPressureRef.current = 0.5;
    isDrawingRef.current = true;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer is already gone; drawing still works.
    }

    const sample = toStrokeSample(event.clientX, event.clientY, event.pointerType, event.pressure);
    pendingRef.current.push(sample);
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(runFrame);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const native = event.nativeEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const events = coalesced.length > 0 ? coalesced : [native];
    for (const raw of events) {
      pendingRef.current.push(
        toStrokeSample(raw.clientX, raw.clientY, raw.pointerType || event.pointerType, raw.pressure),
      );
    }
  };

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      // Flush any samples that arrived since the last frame, then bake the stroke.
      if (pendingRef.current.length > 0) {
        engineRef.current.addSamples(canvas, pendingRef.current);
        pendingRef.current = [];
      }
      engineRef.current.endStroke(canvas);
      if (event) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore — capture may already be released.
        }
      }
    }
    lastSampleRef.current = null;
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.length === 0) return;
    const currentSnapshot = captureSnapshot();
    if (!currentSnapshot) return;
    playToolSelect();
    const previousStates = [...undoStack];
    const previousState = previousStates.pop();
    setUndoStack(previousStates);
    setRedoStack((states) => [...states, currentSnapshot]);
    if (previousState) restoreCanvas(canvas, previousState);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.length === 0) return;
    const currentSnapshot = captureSnapshot();
    if (!currentSnapshot) return;
    playToolSelect();
    const nextStates = [...redoStack];
    const nextState = nextStates.pop();
    setUndoStack((states) => [...states, currentSnapshot]);
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
