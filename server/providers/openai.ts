import OpenAI from 'openai';
import type { ImageProvider, ProviderGenerationRequest } from './types';

export class OpenAIImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  async validateConnection() {
    try {
      await new OpenAI({ apiKey: this.secret }).models.list();
      return { valid: true, message: 'OpenAI bağlantısı hazır.' };
    } catch (error) {
      return { valid: false, message: this.normalizeError(error).message };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const result = await new OpenAI({ apiKey: this.secret }).images.generate({
      model: request.model,
      prompt: request.prompt,
      n: 1,
      size: request.orientation === 'portrait' ? '1024x1536' : '1536x1024',
      quality: 'medium',
      output_format: 'png',
      background: 'opaque',
      moderation: 'auto',
      user: request.userId,
    });
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('OpenAI görsel verisi döndürmedi.');
    return { buffer: Buffer.from(base64, 'base64'), mimeType: 'image/png' as const, model: request.model };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'OpenAI isteği başarısız.';
    return new Error(message.replace(/sk-[A-Za-z0-9_-]+/g, '[GİZLİ]'));
  }
}
