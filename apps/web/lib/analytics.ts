declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

export function initAnalytics(): void {
  if (!GA_ID) return;

  // Inject gtag.js script dynamically
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });
}

export function trackEvent(action: string, properties?: Record<string, unknown>): void {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', action, properties);
}

export function trackPageView(path: string): void {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', { page_path: path });
}
