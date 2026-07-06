import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../config';
import { decryptSecret, encryptSecret, maskSecret } from './crypto';

describe('BYOK encryption', () => {
  beforeEach(() => { config.encryptionKey = 'ab'.repeat(32); });

  it('encrypts and authenticates API keys', () => {
    const secret = 'sk-example-super-secret-1234';
    const encrypted = encryptSecret(secret);
    expect(encrypted.secret_ciphertext).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
    expect(maskSecret(secret)).toBe('...1234');
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptSecret('AIza-example-key-9876');
    const tag = Buffer.from(encrypted.secret_tag, 'base64');
    tag[0] ^= 0xff;
    encrypted.secret_tag = tag.toString('base64');
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
