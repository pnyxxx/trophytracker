/**
 * Titres et descriptions des pages publiques fixes : source unique pour le site (Seo.tsx) et pour
 * les pages HTML pré-générées à la compilation (seo-plugin.ts), que Google et les aperçus de partage
 * (WhatsApp, Facebook…) lisent sans exécuter le JavaScript.
 * Fichier sans dépendance : il est aussi chargé par la configuration de Vite.
 */

/** Adresse officielle du site (adresses canoniques et images de partage, qui doivent être absolues). */
export const SITE_URL = 'https://trophytracker.fr';
export const SITE_NAME = 'TrophyTracker';

export const DEFAULT_TITLE = 'TrophyTracker — Suivez les équipages du 4L Trophy en direct';
export const DEFAULT_DESCRIPTION =
  'Proches, amis, sponsors : suivez en direct la position, la trace complète et les photos des équipages du 4L Trophy. Gratuit pour les proches.';

/** Titre complet affiché dans l'onglet et dans Google. */
export const fullTitle = (title?: string) => (title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE);

export interface PageSeo {
  title?: string;
  description?: string;
}

/** Pages indexables à adresse fixe (même liste que le plan du site, apps/tracker/src/sitemap.ts). */
export const PAGES = {
  '/': {},
  '/equipages': { title: 'Équipages', description: 'Trouvez et suivez en direct les équipages du 4L Trophy.' },
  '/mentions-legales': { title: 'Mentions légales' },
  '/confidentialite': { title: 'Confidentialité' },
  '/conditions-utilisation': { title: 'Conditions d’utilisation' },
  '/conditions-vente': { title: 'Conditions de vente' },
} satisfies Record<string, PageSeo>;
