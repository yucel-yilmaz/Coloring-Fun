import OpenAI, { RateLimitError } from 'openai';
import { config } from '../config';
import { HttpError } from '../http';

function toModerationError(error: unknown) {
  if (error instanceof RateLimitError) {
    return new HttpError(503, 'MODERATION_RATE_LIMITED', 'Güvenlik kontrol servisi şu anda yoğun. Lütfen birkaç saniye bekleyip tekrar deneyin.');
  }
  return error;
}

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
  return new OpenAI({ apiKey: config.moderationKey });
}

export async function moderateText(text: string) {
  const moderationClient = client();
  if (!moderationClient) return localTextSafetyCheck(text);
  try {
    const result = await moderationClient.moderations.create({ model: 'omni-moderation-latest', input: text });
    return { flagged: result.results.some((item) => item.flagged), details: { mode: 'platform-moderation', result: result.results[0] } };
  } catch (error) {
    if (config.allowDegradedModeration) return localTextSafetyCheck(text);
    throw toModerationError(error);
  }
}

export async function moderateImage(buffer: Buffer) {
  const moderationClient = client();
  if (!moderationClient) return { flagged: false, details: { mode: 'provider-image-safety' } };
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  try {
    const result = await moderationClient.moderations.create({
      model: 'omni-moderation-latest',
      input: [{ type: 'image_url', image_url: { url: dataUrl } }],
    });
    return { flagged: result.results.some((item) => item.flagged), details: { mode: 'platform-moderation', result: result.results[0] } };
  } catch (error) {
    if (config.allowDegradedModeration) return { flagged: false, details: { mode: 'provider-image-safety' } };
    throw toModerationError(error);
  }
}
