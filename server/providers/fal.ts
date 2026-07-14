import type { ImageProvider, ProviderGenerationRequest } from './types';

const ENDPOINT = 'https://fal.run/fal-ai/fast-lightning-sdxl';

export class FalImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  async validateConnection() {
    // fal.ai has no free "whoami"-style endpoint; a well-formed key is treated as valid here,
    // real auth failures surface with a clear message on first generation instead.
    if (!this.secret || !this.secret.includes(':')) {
      return { valid: false, message: 'fal.ai anahtarı "key_id:key_secret" biçiminde olmalı.' };
    }
    return { valid: true, message: 'fal.ai bağlantısı kaydedildi. İlk üretimde doğrulanacak.' };
  }

  async generate(request: ProviderGenerationRequest) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Key ${this.secret}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        image_size: request.orientation === 'portrait' ? 'portrait_4_3' : 'landscape_4_3',
        num_images: 1,
        format: 'png',
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`fal.ai üretimi başarısız (${response.status}): ${detail.slice(0, 300)}`);
    }
    const result = await response.json() as { images?: Array<{ url?: string }> };
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal.ai görsel URL\'si döndürmedi.');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`fal.ai görseli indirilemedi (${imageResponse.status}).`);
    return {
      buffer: Buffer.from(await imageResponse.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: request.model,
    };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'fal.ai isteği başarısız.';
    return new Error(message.replace(/Key [A-Za-z0-9_-]+:[A-Za-z0-9_-]+/g, '[GİZLİ]'));
  }
}
