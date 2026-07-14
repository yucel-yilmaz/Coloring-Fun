import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import type { ImageProvider, ProviderGenerationRequest } from './types';

export class GeminiImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  async validateConnection() {
    try {
      const pager = await new GoogleGenAI({ apiKey: this.secret }).models.list({ config: { pageSize: 1 } });
      void pager;
      return { valid: true, message: 'Gemini bağlantısı hazır.' };
    } catch (error) {
      return { valid: false, message: this.normalizeError(error).message };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const ai = new GoogleGenAI({ apiKey: this.secret });
    const interaction = await ai.interactions.create({
      model: request.model,
      input: request.prompt,
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        aspect_ratio: request.orientation === 'portrait' ? '2:3' : '3:2',
        image_size: '1K',
      },
    });
    const base64 = interaction.output_image?.data;
    if (!base64) throw new Error('Gemini görsel verisi döndürmedi.');
    const buffer = await sharp(Buffer.from(base64, 'base64')).png().toBuffer();
    return { buffer, mimeType: 'image/png' as const, model: request.model };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Gemini isteği başarısız.';
    return new Error(message.replace(/AIza[A-Za-z0-9_-]+/g, '[GİZLİ]'));
  }
}
