import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config';
import { HttpError } from '../http';

function getKey() {
  if (!/^[a-f\d]{64}$/i.test(config.encryptionKey)) {
    throw new HttpError(503, 'ENCRYPTION_NOT_CONFIGURED', 'AI anahtar şifrelemesi yapılandırılmadı.');
  }
  return Buffer.from(config.encryptionKey, 'hex');
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    secret_ciphertext: ciphertext.toString('base64'),
    secret_iv: iv.toString('base64'),
    secret_tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(record: { secret_ciphertext: string; secret_iv: string; secret_tag: string }) {
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(record.secret_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.secret_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.secret_ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskSecret(value: string) {
  return `...${value.slice(-4)}`;
}
