import { describe, expect, it } from 'vitest';
import { getProxiedImageUrl } from './image';

describe('getProxiedImageUrl', () => {
  it('keeps local Supabase Storage URLs direct on a LAN', () => {
    const url = 'http://192.168.2.97:54321/storage/v1/object/sign/artworks/page.png?token=test';
    expect(getProxiedImageUrl(url)).toBe(url);
  });

  it('proxies public remote images', () => {
    const url = 'https://images.example.com/page.png';
    expect(getProxiedImageUrl(url)).toBe(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  });
});
