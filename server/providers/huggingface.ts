import { InferenceClient } from '@huggingface/inference';
import type { ImageProvider, ProviderGenerationRequest } from './types';

export class HuggingFaceImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  async validateConnection() {
    try {
      const response = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { authorization: `Bearer ${this.secret}` },
      });
      if (!response.ok) return { valid: false, message: `Hugging Face anahtarı doğrulanamadı (${response.status}).` };
      return { valid: true, message: 'Hugging Face bağlantısı hazır.' };
    } catch (error) {
      return { valid: false, message: this.normalizeError(error).message };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const client = new InferenceClient(this.secret);
    const blob = await client.textToImage({ model: request.model, inputs: request.prompt }, { outputType: 'blob' });
    return {
      buffer: Buffer.from(await blob.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: request.model,
    };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Hugging Face isteği başarısız.';
    return new Error(message.replace(/hf_[A-Za-z0-9]+/g, '[GİZLİ]'));
  }
}
