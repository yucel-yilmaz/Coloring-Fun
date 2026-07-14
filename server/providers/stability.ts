import type { ImageProvider, ProviderGenerationRequest } from './types';

const ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/generate/core';

export class StabilityImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  async validateConnection() {
    try {
      const response = await fetch('https://api.stability.ai/v1/user/account', {
        headers: { authorization: `Bearer ${this.secret}` },
      });
      if (!response.ok) return { valid: false, message: `Stability AI anahtarı doğrulanamadı (${response.status}).` };
      return { valid: true, message: 'Stability AI bağlantısı hazır.' };
    } catch (error) {
      return { valid: false, message: this.normalizeError(error).message };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const form = new FormData();
    form.append('prompt', request.prompt);
    form.append('output_format', 'png');
    form.append('aspect_ratio', request.orientation === 'portrait' ? '2:3' : '3:2');

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.secret}`,
        accept: 'image/*',
      },
      body: form,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Stability AI üretimi başarısız (${response.status}): ${detail.slice(0, 300)}`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: request.model,
    };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Stability AI isteği başarısız.';
    return new Error(message.replace(/sk-[A-Za-z0-9]+/g, '[GİZLİ]'));
  }
}
