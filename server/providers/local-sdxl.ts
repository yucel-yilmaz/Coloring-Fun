import { config } from '../config';
import type { ImageProvider, ProviderGenerationRequest } from './types';

const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

export class LocalSdxlImageProvider implements ImageProvider {
  async validateConnection() {
    try {
      const response = await fetch(`${config.localImageApiUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = await response.json() as { ready?: boolean; device?: string };
      return {
        valid: status.ready === true,
        message: status.ready
          ? `Yerel SDXL servisi hazır (${status.device || 'Apple Silicon'}).`
          : 'Yerel SDXL servisi modeli yüklemeye hazır değil.',
      };
    } catch {
      return { valid: false, message: 'Yerel SDXL servisine ulaşılamadı. Önce npm run local-ai:start komutunu çalıştırın.' };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const response = await fetch(`${config.localImageApiUrl}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt, orientation: request.orientation }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Yerel SDXL üretimi başarısız (${response.status}): ${detail.slice(0, 300)}`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: 'sdxl-lightning-coloringbook',
    };
  }

  normalizeError(error: unknown) {
    return error instanceof Error ? error : new Error('Yerel SDXL isteği başarısız.');
  }
}
