export type AiProvider = 'openai' | 'gemini' | 'local_sdxl';

export interface ProviderGenerationRequest {
  prompt: string;
  model: string;
  orientation: 'portrait' | 'landscape';
  userId: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: 'image/png';
  model: string;
}

export interface ImageProvider {
  validateConnection(secret: string): Promise<{ valid: boolean; message: string }>;
  generate(request: ProviderGenerationRequest): Promise<GeneratedImage>;
  normalizeError(error: unknown): Error;
}
