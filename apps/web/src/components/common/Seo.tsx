import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, fullTitle as makeTitle } from '@/lib/seo-pages';

/** Crée la balise `<meta>` (ou `<link>`) si elle manque, puis règle son contenu. */
function setTag(selector: string, create: () => HTMLElement, attr: 'content' | 'href', value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (key: 'name' | 'property') => (name: string, value: string) =>
  setTag(`meta[${key}="${name}"]`, () => Object.assign(document.createElement('meta'), { [key]: name }), 'content', value);
const setName = meta('name');
const setProperty = meta('property');

/**
 * Référencement de la page : titre, description, adresse canonique, aperçus de partage
 * (Open Graph / X), consigne `noindex` et données structurées (JSON-LD).
 * Le HTML envoyé par le serveur porte déjà les bonnes balises (seo-plugin.ts, apps/tracker/src/crew-page.ts) ;
 * ce composant les tient à jour lors de la navigation dans le site.
 */
export function Seo({ title, description, image, noindex, jsonLd }: {
  title?: string;
  description?: string;
  /** Aperçu de partage ; par défaut l'image du site. */
  image?: string | null;
  /** Page à ne pas faire apparaître dans Google (comptes, pages privées, 404). */
  noindex?: boolean;
  /** Données structurées schema.org (un objet ou une liste d'objets). */
  jsonLd?: object | object[];
}) {
  const json = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const fullTitle = makeTitle(title);
    const desc = description ?? DEFAULT_DESCRIPTION;
    // Sans chaîne de requête ni ancre : /road-trip/nom?x=1 et /road-trip/nom sont la même page.
    const url = `${window.location.origin}${window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/$/, '')}`;
    const img = new URL(image ?? '/og-image.png', window.location.origin).href;

    document.title = fullTitle;
    setName('description', desc);
    setName('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url);
    setProperty('og:title', fullTitle);
    setProperty('og:description', desc);
    setProperty('og:url', url);
    setProperty('og:image', img);
    setName('twitter:title', fullTitle);
    setName('twitter:description', desc);
    setName('twitter:image', img);

    let script: HTMLScriptElement | null = null;
    if (json) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = json;
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [title, description, image, noindex, json]);

  return null;
}
