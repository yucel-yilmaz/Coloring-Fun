import { FalImageProvider } from './fal';
import { GeminiImageProvider } from './gemini';
import { HuggingFaceImageProvider } from './huggingface';
import { LocalSdxlImageProvider } from './local-sdxl';
import { OpenAIImageProvider } from './openai';
import { ReplicateImageProvider } from './replicate';
import { StabilityImageProvider } from './stability';
import type { AiProvider } from './types';

export function createProvider(provider: AiProvider, secret: string) {
  if (provider === 'openai') return new OpenAIImageProvider(secret);
  if (provider === 'gemini') return new GeminiImageProvider(secret);
  if (provider === 'fal') return new FalImageProvider(secret);
  if (provider === 'replicate') return new ReplicateImageProvider(secret);
  if (provider === 'huggingface') return new HuggingFaceImageProvider(secret);
  if (provider === 'stability') return new StabilityImageProvider(secret);
  return new LocalSdxlImageProvider();
}
