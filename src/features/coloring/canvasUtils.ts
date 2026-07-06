interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface CachedLineArtMask {
  width: number;
  height: number;
  data: ImageData;
}

export function createLineArtMask(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
): CachedLineArtMask | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) return null;

  const scale = Math.min(
    canvas.width / image.naturalWidth,
    canvas.height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  maskContext.fillStyle = '#ffffff';
  maskContext.fillRect(0, 0, canvas.width, canvas.height);
  maskContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  try {
    return {
      width: canvas.width,
      height: canvas.height,
      data: maskContext.getImageData(0, 0, canvas.width, canvas.height),
    };
  } catch (error) {
    console.warn('Unable to read line art for bucket boundaries', error);
    return null;
  }
}

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 215, b: 0 };
}

function colorDistanceWithin(first: RgbColor, second: RgbColor, tolerance: number) {
  return (
    Math.abs(first.r - second.r) < tolerance &&
    Math.abs(first.g - second.g) < tolerance &&
    Math.abs(first.b - second.b) < tolerance
  );
}

export function floodFill(
  context: CanvasRenderingContext2D,
  lineArtData: ImageData,
  startX: number,
  startY: number,
  selectedColor: string,
) {
  const canvasData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const { width, height } = canvasData;
  const fillColor = hexToRgb(selectedColor);

  const getPixel = (data: ImageData, x: number, y: number): RgbColor => {
    const index = (y * data.width + x) * 4;
    return {
      r: data.data[index],
      g: data.data[index + 1],
      b: data.data[index + 2],
    };
  };

  const targetColor = getPixel(canvasData, startX, startY);
  if (colorDistanceWithin(targetColor, fillColor, 15)) return false;

  const outlineColor = getPixel(lineArtData, startX, startY);
  const outlineLuminance =
    0.299 * outlineColor.r + 0.587 * outlineColor.g + 0.114 * outlineColor.b;
  if (outlineLuminance < 130) return false;

  const visited = new Uint8Array(width * height);
  const stack = [startX + startY * width];
  visited[startY * width + startX] = 1;

  while (stack.length > 0) {
    const index = stack.pop()!;
    const x = index % width;
    const y = Math.floor(index / width);
    const pixelIndex = index * 4;

    canvasData.data[pixelIndex] = fillColor.r;
    canvasData.data[pixelIndex + 1] = fillColor.g;
    canvasData.data[pixelIndex + 2] = fillColor.b;
    canvasData.data[pixelIndex + 3] = 255;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nextX, nextY] of neighbors) {
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;

      const nextIndex = nextX + nextY * width;
      if (visited[nextIndex]) continue;
      visited[nextIndex] = 1;

      const boundaryColor = getPixel(lineArtData, nextX, nextY);
      const boundaryLuminance =
        0.299 * boundaryColor.r + 0.587 * boundaryColor.g + 0.114 * boundaryColor.b;
      const canvasColor = getPixel(canvasData, nextX, nextY);

      if (
        boundaryLuminance >= 130 &&
        colorDistanceWithin(canvasColor, targetColor, 60)
      ) {
        stack.push(nextIndex);
      }
    }
  }

  context.putImageData(canvasData, 0, 0);
  return true;
}
