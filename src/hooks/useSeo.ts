import { useEffect } from 'react';

const APP_NAME = 'Atlase';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export interface SeoOptions {
  title?: string;
  description?: string;
  noindex?: boolean;
}

/**
 * Lightweight document head manager for the SPA: sets the title, meta description,
 * Open Graph title, and robots directives per route. Private routes (admin, cart,
 * checkout, account) pass `noindex` so they stay out of search results (in addition
 * to robots.txt). Rich JSON-LD/social scraping is best served via prerendering.
 */
export function useSeo({ title, description, noindex }: SeoOptions): void {
  useEffect(() => {
    const fullTitle = title ? (title.includes(APP_NAME) ? title : `${title} · ${APP_NAME}`) : APP_NAME;
    document.title = fullTitle;
    upsertMeta('property', 'og:title', fullTitle);
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex]);
}
