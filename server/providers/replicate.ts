import type { ImageProvider, ProviderGenerationRequest } from './types';

const API_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 3 * 60 * 1000;

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
}

export class ReplicateImageProvider implements ImageProvider {
  constructor(private secret: string) {}

  private headers() {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.secret}`,
    };
  }

  async validateConnection() {
    try {
      const response = await fetch(`${API_BASE}/account`, { headers: this.headers() });
      if (!response.ok) return { valid: false, message: `Replicate anahtarı doğrulanamadı (${response.status}).` };
      return { valid: true, message: 'Replicate bağlantısı hazır.' };
    } catch (error) {
      return { valid: false, message: this.normalizeError(error).message };
    }
  }

  async generate(request: ProviderGenerationRequest) {
    const [owner, name] = request.model.split('/');
    const create = await fetch(`${API_BASE}/models/${owner}/${name}/predictions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ input: { prompt: request.prompt } }),
    });
    if (!create.ok) {
      const detail = await create.text();
      throw new Error(`Replicate isteği başarısız (${create.status}): ${detail.slice(0, 300)}`);
    }
    let prediction = await create.json() as ReplicatePrediction;

    const timeoutAt = Date.now() + TIMEOUT_MS;
    while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
      if (Date.now() > timeoutAt) throw new Error('Replicate üretimi zaman aşımına uğradı.');
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const poll = await fetch(`${API_BASE}/predictions/${prediction.id}`, { headers: this.headers() });
      if (!poll.ok) throw new Error(`Replicate durum sorgusu başarısız (${poll.status}).`);
      prediction = await poll.json() as ReplicatePrediction;
    }
    if (prediction.status !== 'succeeded') throw new Error(prediction.error || 'Replicate üretimi başarısız oldu.');

    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!imageUrl) throw new Error('Replicate görsel URL\'si döndürmedi.');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Replicate görseli indirilemedi (${imageResponse.status}).`);
    return {
      buffer: Buffer.from(await imageResponse.arrayBuffer()),
      mimeType: 'image/png' as const,
      model: request.model,
    };
  }

  normalizeError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Replicate isteği başarısız.';
    return new Error(message.replace(/r8_[A-Za-z0-9]+/g, '[GİZLİ]'));
  }
}
