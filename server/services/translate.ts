import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

const TRANSLATE_MODEL = 'gemini-flash-lite-latest';

function isLikelyEnglish(text: string) {
  return /^[\x00-\x7F]*$/.test(text);
}

/**
 * Community/open-weight image models (see SHORT_PROMPT_PROVIDERS in worker.ts) are trained mostly
 * on English captions and follow non-English subjects poorly. Reuses the platform's Gemini
 * moderation key for this utility call rather than requiring a separate translation key.
 * Never throws: translation is a quality nicety, not a safety gate, so any failure falls back to
 * the original text instead of blocking generation.
 */
export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || isLikelyEnglish(trimmed) || !config.moderationKey) return trimmed;
  try {
    const ai = new GoogleGenAI({ apiKey: config.moderationKey });
    const response = await ai.models.generateContent({
      model: TRANSLATE_MODEL,
      contents: `Translate the following text to English. Output only the translation, no quotes, no explanation, no extra text:\n\n${trimmed}`,
      config: { maxOutputTokens: 100 },
    });
    return response.text?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}
