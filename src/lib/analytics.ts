type PlausibleFn = ((event: string, options?: { props?: Record<string, string | number | boolean>; u?: string }) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
const scriptUrl = import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL as string | undefined;

let initialized = false;

/** Injects the self-hosted Plausible script (manual pageview mode). No-op if not configured, so local/dev stays clean. */
export function initAnalytics() {
  if (initialized || !domain || !scriptUrl) return;
  initialized = true;
  const queue: PlausibleFn = window.plausible || ((...args: Parameters<PlausibleFn>) => {
    queue.q = queue.q || [];
    queue.q.push(args);
  });
  window.plausible = queue;
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.src = scriptUrl;
  document.head.appendChild(script);
}

export function trackPageview(url: string) {
  window.plausible?.('pageview', { u: url });
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  window.plausible?.(name, { props });
}
