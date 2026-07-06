import { GeminiImageProvider } from './gemini';
import { LocalSdxlImageProvider } from './local-sdxl';
import { OpenAIImageProvider } from './openai';
import type { AiProvider } from './types';

export function createProvider(provider: AiProvider, secret: string) {
  if (provider === 'openai') return new OpenAIImageProvider(secret);
  if (provider === 'gemini') return new GeminiImageProvider(secret);
  return new LocalSdxlImageProvider();
}
