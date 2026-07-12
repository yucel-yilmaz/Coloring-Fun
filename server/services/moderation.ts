import { ApiError, GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { config } from '../config';
import { HttpError } from '../http';

function toModerationError(error: unknown) {
  if (error instanceof ApiError && error.status === 429) {
    return new HttpError(503, 'MODERATION_RATE_LIMITED', 'Güvenlik kontrol servisi şu anda yoğun. Lütfen birkaç saniye bekleyip tekrar deneyin.');
  }
  return error;
}

const MODERATION_MODEL = 'gemini-flash-lite-latest';
const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }));

const UNSAFE_CHILD_CONTENT = [
  /\b(?:porn|porno|pornografi|seks|sexual|nude|naked|çıplak)\b/iu,
  /\b(?:kill|murder|suicide|blood|gore|weapon|gun|bomb|öldür|cinayet|intihar|kanlı|silah|bomba)\b/iu,
  /\b(?:nazi|terrorist|terrorism|terör|uyuşturucu|cocaine|heroin|meth)\b/iu,
];

const PERSONAL_DATA = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /(?:\+?90|0)?\s*\(?5\d{2}\)?(?:[\s.-]*\d{3})(?:[\s.-]*\d{2}){2}\b/u,
  /https?:\/\/|www\./iu,
];

export function localTextSafetyCheck(text: string) {
  const unsafe = UNSAFE_CHILD_CONTENT.some((pattern) => pattern.test(text));
  const personalData = PERSONAL_DATA.some((pattern) => pattern.test(text));
  return {
    flagged: unsafe || personalData,
    details: { mode: 'local-child-safety', unsafe, personalData },
  };
}

function client() {
  if (!config.moderationKey) {
    if (config.allowDegradedModeration) return null;
    throw new HttpError(503, 'MODERATION_NOT_CONFIGURED', 'Güvenlik servisi yapılandırılmadığı için üretim geçici olarak kapalı.');
  }
  return new GoogleGenAI({ apiKey: config.moderationKey });
}

function isBlocked(response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>) {
  return Boolean(response.promptFeedback?.blockReason)
    || Boolean(response.candidates?.[0]?.safetyRatings?.some((rating) => rating.blocked));
}

export async function moderateText(text: string) {
  const moderationClient = client();
  const local = localTextSafetyCheck(text);
  if (local.flagged) return local;
  if (!moderationClient) return local;
  try {
    const response = await moderationClient.models.generateContent({
      model: MODERATION_MODEL,
      contents: text,
      config: { safetySettings: SAFETY_SETTINGS, maxOutputTokens: 1 },
    });
    return { flagged: isBlocked(response), details: { mode: 'platform-moderation', promptFeedback: response.promptFeedback, safetyRatings: response.candidates?.[0]?.safetyRatings } };
  } catch (error) {
    if (config.allowDegradedModeration) return local;
    throw toModerationError(error);
  }
}

export async function moderateImage(buffer: Buffer) {
  const moderationClient = client();
  if (!moderationClient) return { flagged: false, details: { mode: 'provider-image-safety' } };
  try {
    const response = await moderationClient.models.generateContent({
      model: MODERATION_MODEL,
      contents: [{ inlineData: { mimeType: 'image/png', data: buffer.toString('base64') } }],
      config: { safetySettings: SAFETY_SETTINGS, maxOutputTokens: 1 },
    });
    return { flagged: isBlocked(response), details: { mode: 'platform-moderation', promptFeedback: response.promptFeedback, safetyRatings: response.candidates?.[0]?.safetyRatings } };
  } catch (error) {
    if (config.allowDegradedModeration) return { flagged: false, details: { mode: 'provider-image-safety' } };
    throw toModerationError(error);
  }
}
