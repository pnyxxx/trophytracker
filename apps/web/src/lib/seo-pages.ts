/**
 * Titres et descriptions des pages publiques fixes : source unique pour le site (Seo.tsx) et pour
 * les pages HTML pré-générées à la compilation (seo-plugin.ts), que Google et les aperçus de partage
 * (WhatsApp, Facebook…) lisent sans exécuter le JavaScript.
 * Fichier sans dépendance : il est aussi chargé par la configuration de Vite.
 */

/** Adresse officielle du site (adresses canoniques et images de partage, qui doivent être absolues). */
export const SITE_URL = 'https://trophytracker.fr';
export const SITE_NAME = 'TrophyTracker';

export const DEFAULT_TITLE = 'TrophyTracker — Le carnet de route en direct de vos road trips';
export const DEFAULT_DESCRIPTION =
  'Raids, road trips, tours du monde : vos proches et sponsors suivent en direct la position, la trace, le relief et les photos de votre road trip. Gratuit pour eux.';

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
