export function getProxiedImageUrl(url: string): string {
  if (!url) return '';

  if (!url.startsWith('http')) return url;

  try {
    const hostname = new URL(url).hostname;
    const isPrivateNetwork =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    // Local Supabase Storage already sends CORS headers. Sending its signed URLs
    // through the public-image proxy makes LAN URLs fail the HTTPS/host allowlist.
    if (isPrivateNetwork) return url;

    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
