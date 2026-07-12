import { useEffect } from 'react';

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');

interface SeoOptions {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Updates document title, meta description, canonical link, and OG/Twitter tags for the current route. */
export function useSeo({ title, description, path, noindex }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('name', 'twitter:description', description);
    }
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    const url = path ? `${SITE_URL}${path}` : undefined;
    if (url) {
      setMeta('property', 'og:url', url);
      let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    }
  }, [title, description, path, noindex]);
}
