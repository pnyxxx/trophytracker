/**
 * Titres et descriptions des pages publiques fixes : source unique pour le site (Seo.tsx) et pour
 * les pages HTML pré-générées à la compilation (seo-plugin.ts), que Google et les aperçus de partage
 * (WhatsApp, Facebook…) lisent sans exécuter le JavaScript.
 * Fichier sans dépendance : il est aussi chargé par la configuration de Vite.
 */

/** Adresse officielle du site (adresses canoniques et images de partage, qui doivent être absolues). */
export const SITE_URL = 'https://trophytracker.fr';
export const SITE_NAME = 'trophytracker';

export const DEFAULT_TITLE = 'trophytracker — Ton road trip, en direct';
export const DEFAULT_DESCRIPTION =
  'Tu roules, ceux que tu invites te suivent : position, trace, photos et stats de ton road trip sur une page privée, accessible uniquement par ton lien. Gratuit pour tes proches, sans appli.';

/** Titre complet affiché dans l'onglet et dans Google. */
export const fullTitle = (title?: string) => (title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE);

export interface PageSeo {
  title?: string;
  description?: string;
}

/** Pages indexables à adresse fixe (même liste que le plan du site, apps/tracker/src/sitemap.ts). */
export const PAGES = {
  '/': {},
  '/mentions-legales': { title: 'Mentions légales' },
  '/confidentialite': { title: 'Confidentialité' },
  '/conditions-utilisation': { title: 'Conditions d’utilisation' },
  '/conditions-vente': { title: 'Conditions de vente' },
} satisfies Record<string, PageSeo>;
