import type { BrushType } from '../../types';

/**
 * Stamp-based brush engine. Instead of drawing straight `lineTo` segments (which look polygonal
 * and compound into dark blotches where a semi-transparent stroke overlaps itself), every stroke is
 * resampled at a fixed spacing and a pre-rendered, grain-textured tip sprite is stamped along the
 * path. Each stroke is rendered into an offscreen buffer at full opacity, then composited onto the
 * artwork once at the brush's target opacity — so coverage is even *within* a stroke while color
 * still builds up *between* strokes (real pencil/pastel behavior).
 */

export interface StrokeSample {
  /** Canvas-internal x coordinate. */
  x: number;
  /** Canvas-internal y coordinate. */
  y: number;
  /** 0..1 — real stylus pressure, or a velocity-derived fallback for mouse/finger. */
  pressure: number;
}

export interface StrokeParams {
  brushType: BrushType;
  isEraser: boolean;
  /** Hex color, e.g. "#ffd700". */
  color: string;
  /** Base tip diameter in canvas-internal pixels (already display-scaled). */
  size: number;
}

const SPRITE_SIZE = 128;
const SPRITE_RADIUS = 58;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/**
 * A tileable grain texture whose alpha "punches holes" into a stroke. Sampled in *canvas space*
 * (the pattern repeats from the origin), so overlapping stamps along a stroke share the same holes
 * instead of filling each other's in — that's what makes pencil/pastel read as tooth rather than a
 * solid fill. `cells` is the noise resolution; scaling it up to `tilePx` with smoothing off yields
 * hard-edged grain (fine for pencil, chunky for pastel).
 */
function makeGrainTile(cells: number, tilePx: number, threshold: number, strength: number): HTMLCanvasElement {
  const src = document.createElement('canvas');
  src.width = cells;
  src.height = cells;
  const srcCtx = src.getContext('2d');
  const tile = document.createElement('canvas');
  tile.width = tilePx;
  tile.height = tilePx;
  const tileCtx = tile.getContext('2d');
  if (!srcCtx || !tileCtx) return tile;
  const image = srcCtx.createImageData(cells, cells);
  const data = image.data;
  for (let i = 0; i < cells * cells; i += 1) {
    const v = Math.random();
    const a = v > threshold ? ((v - threshold) / (1 - threshold)) * strength : 0;
    data[i * 4 + 3] = Math.round(a * 255);
  }
  srcCtx.putImageData(image, 0, 0);
  tileCtx.imageSmoothingEnabled = false;
  tileCtx.drawImage(src, 0, 0, tilePx, tilePx);
  return tile;
}

// Generated once. Fine, aggressive tooth for pencil; chunky, softer tooth for pastel/crayon.
const pencilGrain = makeGrainTile(96, 96, 0.42, 0.95);
const crayonGrain = makeGrainTile(22, 88, 0.5, 0.7);

function grainTileFor(brushType: BrushType): HTMLCanvasElement | null {
  if (brushType === 'pencil') return pencilGrain;
  if (brushType === 'crayon') return crayonGrain;
  return null;
}

/** Alpha profile (0..1) for a tip at normalized distance-from-center `d` (0 center, 1 rim). */
function tipAlpha(brushType: BrushType, isEraser: boolean, d: number): number {
  if (d > 1) return 0;
  if (isEraser) {
    return d < 0.6 ? 1 : Math.max(0, 1 - (d - 0.6) / 0.4);
  }
  if (brushType === 'pencil') {
    // Firm, near-solid round; the world-aligned grain (applied on stroke end) supplies the tooth.
    return d < 0.88 ? 1 : Math.max(0, 1 - (d - 0.88) / 0.12);
  }
  if (brushType === 'crayon') {
    // Broad, soft, chalky body; coarse grain applied on stroke end.
    return Math.pow(Math.max(0, 1 - d), 0.7);
  }
  // marker (and the fallback): soft, feathered, near-opaque core — smooth painterly brush.
  return d < 0.62 ? 1 : Math.max(0, 1 - (d - 0.62) / 0.38);
}

function buildTip(brushType: BrushType, isEraser: boolean, rgb: Rgb): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
  const data = image.data;
  const center = SPRITE_SIZE / 2;
  for (let y = 0; y < SPRITE_SIZE; y += 1) {
    for (let x = 0; x < SPRITE_SIZE; x += 1) {
      const dx = (x - center) / SPRITE_RADIUS;
      const dy = (y - center) / SPRITE_RADIUS;
      const d = Math.hypot(dx, dy);
      const a = tipAlpha(brushType, isEraser, d);
      const i = (y * SPRITE_SIZE + x) * 4;
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Opacity a whole stroke is composited onto the artwork at (governs cross-stroke buildup). */
function strokeOpacity(params: StrokeParams): number {
  if (params.isEraser) return 1;
  switch (params.brushType) {
    case 'pencil':
      return 0.78;
    case 'marker':
      return 0.92;
    case 'crayon':
      return 0.8;
    case 'spray':
      return 1;
    default:
      return 0.9;
  }
}

/** Distance between stamps along the path, in internal px. Tight spacing → smooth strokes. */
function stampSpacing(params: StrokeParams): number {
  const radius = params.size / 2;
  if (params.brushType === 'spray') return Math.max(2, radius * 0.4);
  return Math.max(0.75, radius * 0.12);
}

function radiusForPressure(params: StrokeParams, pressure: number): number {
  // Pencil runs finer than the paint brushes at the same nominal size.
  const sizeFactor = !params.isEraser && params.brushType === 'pencil' ? 0.7 : 1;
  const baseRadius = (params.size / 2) * sizeFactor;
  const scale = params.isEraser ? 1 : 0.35 + 0.65 * pressure;
  return Math.max(0.6, baseRadius * scale);
}

export function createBrushEngine() {
  const base = document.createElement('canvas');
  const stroke = document.createElement('canvas');
  const tipCache = new Map<string, HTMLCanvasElement>();

  let state: {
    params: StrokeParams;
    last: StrokeSample | null;
    residual: number;
  } | null = null;

  function ensureSize(width: number, height: number) {
    if (base.width !== width || base.height !== height) {
      base.width = width;
      base.height = height;
    }
    if (stroke.width !== width || stroke.height !== height) {
      stroke.width = width;
      stroke.height = height;
    }
  }

  function tipFor(params: StrokeParams): HTMLCanvasElement {
    const key = `${params.isEraser ? 'eraser' : params.brushType}|${params.color}`;
    let tip = tipCache.get(key);
    if (!tip) {
      tip = buildTip(params.brushType, params.isEraser, parseHex(params.isEraser ? '#ffffff' : params.color));
      tipCache.set(key, tip);
    }
    return tip;
  }

  function repaint(main: HTMLCanvasElement) {
    if (!state) return;
    const ctx = main.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(base, 0, 0);
    ctx.globalAlpha = strokeOpacity(state.params);
    ctx.drawImage(stroke, 0, 0);
    ctx.globalAlpha = 1;
  }

  function emitSpray(ctx: CanvasRenderingContext2D, params: StrokeParams, point: StrokeSample) {
    const radius = (params.size / 2) * (0.55 + 0.45 * point.pressure);
    const count = Math.max(3, Math.min(48, Math.round(radius * 0.9)));
    const dotRadius = Math.max(0.6, radius * 0.05);
    ctx.fillStyle = params.color;
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      // pow < 1 biases samples toward the center for an airbrush-style density falloff.
      const dist = radius * Math.pow(Math.random(), 0.65);
      ctx.beginPath();
      ctx.arc(point.x + Math.cos(angle) * dist, point.y + Math.sin(angle) * dist, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function stampAt(ctx: CanvasRenderingContext2D, params: StrokeParams, point: StrokeSample) {
    if (params.brushType === 'spray' && !params.isEraser) {
      emitSpray(ctx, params, point);
      return;
    }
    const radius = radiusForPressure(params, point.pressure);
    const tip = tipFor(params);
    ctx.globalAlpha = 1;
    ctx.drawImage(tip, point.x - radius, point.y - radius, radius * 2, radius * 2);
  }

  return {
    beginStroke(main: HTMLCanvasElement, params: StrokeParams) {
      ensureSize(main.width, main.height);
      const baseCtx = base.getContext('2d');
      const strokeCtx = stroke.getContext('2d');
      if (!baseCtx || !strokeCtx) return;
      baseCtx.clearRect(0, 0, base.width, base.height);
      baseCtx.drawImage(main, 0, 0);
      strokeCtx.clearRect(0, 0, stroke.width, stroke.height);
      state = { params, last: null, residual: 0 };
    },

    addSamples(main: HTMLCanvasElement, samples: StrokeSample[]) {
      if (!state || samples.length === 0) return;
      const ctx = stroke.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = 'source-over';
      const spacing = stampSpacing(state.params);
      for (const sample of samples) {
        if (!state.last) {
          state.last = sample;
          stampAt(ctx, state.params, sample);
          continue;
        }
        const from = state.last;
        const dx = sample.x - from.x;
        const dy = sample.y - from.y;
        const distance = Math.hypot(dx, dy);
        let traveled = state.residual;
        while (traveled <= distance) {
          const t = distance === 0 ? 0 : traveled / distance;
          stampAt(ctx, state.params, {
            x: from.x + dx * t,
            y: from.y + dy * t,
            pressure: from.pressure + (sample.pressure - from.pressure) * t,
          });
          traveled += spacing;
        }
        state.residual = traveled - distance;
        state.last = sample;
      }
      repaint(main);
    },

    /** Keep laying down paint while the pointer is held still (airbrush dwell). */
    tickDwell(main: HTMLCanvasElement) {
      if (!state || state.params.brushType !== 'spray' || state.params.isEraser || !state.last) return;
      const ctx = stroke.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = 'source-over';
      emitSpray(ctx, state.params, state.last);
      repaint(main);
    },

    endStroke(main: HTMLCanvasElement) {
      if (!state) return;
      // Punch world-aligned tooth into the finished stroke so overlapping stamps share holes
      // (consistent grain) rather than filling each other in (solid fill).
      const grain = state.params.isEraser ? null : grainTileFor(state.params.brushType);
      const ctx = stroke.getContext('2d');
      if (grain && ctx) {
        const pattern = ctx.createPattern(grain, 'repeat');
        if (pattern) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, stroke.width, stroke.height);
          ctx.restore();
        }
      }
      repaint(main);
      state = null;
    },

    isSpray(): boolean {
      return state?.params.brushType === 'spray' && !state.params.isEraser;
    },
  };
}

export type BrushEngine = ReturnType<typeof createBrushEngine>;
