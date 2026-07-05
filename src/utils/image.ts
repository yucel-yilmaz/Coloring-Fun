export function getProxiedImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
